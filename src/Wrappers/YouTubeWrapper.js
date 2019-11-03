const express = require('express')
var request = require('request')


module.exports = {
	YouTubeAPI: function ({ access_tokens }) {
		this.access_tokens = access_tokens.map(token => {
			return {
				token,
				uses: 0,
				lastUsed: null
			}
		})
		this.current_access_token = {
			token: this.access_tokens[0].token,
			index: 0
		}
		
		// Sets token from array of tokens. Just pass the index
		this.setCurrentAccessToken = (index) => {
			this.current_access_token = {
				token: this.access_tokens[index].token,
				index
			}
			console.log('ACCESS TOKEN SET::: ' + this.current_access_token.token)
		}
		// Checks the next token exists and sets it
		this.cycleAccessToken = () => {
			let index = this.current_access_token.index + 1
			if(this.access_tokens[index]) {
				console.log('CYCLING ACCESS TOKEN: + 1::')
				this.setCurrentAccessToken(index)
			} else {
				console.log('CYCLING ACCESS TOKEN: Coming back to first access_token::')
				this.setCurrentAccessToken(0)
			}
			// TODO manage unusable tokens
			return true
		}

		// TODO Link this with code
		this.accessTokenUsed = () => {
			this.access_tokens[this.current_access_token.index].uses++
			this.access_tokens[this.current_access_token.index].lastUsed = new Date()
		}

		this.giveMe = {
			current_access_token: () => this.current_access_token.token,
		}
		
		this.Youtubize = (track) => {
			return new Promise((resolve, reject) => {
				handleYtQuery(track, { tokenFunction: this.giveMe.current_access_token, tokenCycle: this.cycleAccessToken })
				.then(track => resolve(track))
				.catch(err => reject(err))				
			})
		}
		
		this.getDetails = (id) => {
			return new Promise((resolve, reject) => {
				ytGetVideoDetails(id, this.giveMe.current_access_token(), true)
				.then(results => {
					console.log(results)
					resolve({...results.items[0], id, duration: parseDuration(results.items[0].contentDetails.duration)})
				})
				.catch(err => {
					console.error(err)
				})
			})
		}

		return this
	}
}

let handleYtQuery = (track, {tokenFunction, tokenCycle}) =>{
	let repeatDetails = (videoIds, resolve, reject, tokenFunction, track, ytQueries) => {
		handleYtDetails(videoIds, track, tokenFunction(), ytQueries)
		.then(track => resolve(track))
		.catch(err => {
			if(err.code === 403 && tokenCycle()) repeatDetails(videoIds, resolve, reject, tokenFunction, track, ytQueries)
			else reject(err)
		})
	}

	let repeatQueries = (track, resolve, reject, tokenFunction) => {
		ytQuery(track, tokenFunction())
		.then(resp => {
			let q = resp.items
			// All 5 results
			let ytQueries = q.map(res => {
				return { id: res.id.videoId, snippet: res.snippet }
			})
			
			//Setting up videoIds in order to get details of videos
			let videoIds = ''
			ytQueries.forEach(vid => videoIds += vid.id + ',')
			videoIds = videoIds.substring(0, videoIds.length - 1)

			repeatDetails(videoIds, resolve, reject, tokenFunction, track, ytQueries)
		})
		.catch(err => {
			if(err.code === 403 && tokenCycle()) repeatQueries(track, resolve, reject, tokenFunction)
			else reject(err)
		})
	}

	return new Promise((resolve, reject) => {
		repeatQueries(track, resolve, reject, tokenFunction)
	})
}

let handleYtDetails = (videoIds, track, token, ytQueries) => {
	return new Promise((resolve, reject) => {
		ytGetVideoDetails(videoIds, token)
		.then(results => {
			let trackDurations = results.items.map(t => parseDuration(t.contentDetails.duration) )
			
			// difference in duration respective to spotify track
			let trackDurationDifference = trackDurations.map(t => {
				let vidDuration = t - track.duration_s
				return vidDuration > 0 ? vidDuration : vidDuration * -1
			})
			
			// Sets each video duration to have it at frontend
			ytQueries = ytQueries.map((q, index) => {
				return {...q, duration: trackDurations[index]}
			})
			
			// BestMatch based on difference in video length
			let bestMatch = ytQueries[calculateBestMatch(trackDurationDifference)].id
			resolve({id: track.id, yt: ytQueries, bestMatch})
		})
		.catch(err => {
			// Quota exceeded
			if(err.code === 403) {
				failed = {
					val: true,
					cont: failed.cont + 1
				}
				
				console.error('QUOTA EXCEEDED', failed.cont, plControl)
				reject({reason: 'quota', retrieved: devolver, retry})
			} else {
				console.error('ERROR WHEN GETTING VIDEO DURATIONS:::', err)
				reject({reason: 'else', err})
			}
			
		})
	})
}


// Track object has query and duration included
function ytQuery ({query, duration}, token) {
	// query = unscapeChars(query)
	return new Promise((resolve, reject) => {
		let reqUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&safeSearch=none&type=video&videoDuration=${duration}&key=${token}`
		request(reqUrl, {}, (error, response) => {
			if (error) {
				reject(error)
			} else { 
				let resp = JSON.parse(response.body)	
				if(resp.error) reject(resp.error)    
				else resolve(resp)
			}
		})
	})
}

function ytGetVideoDetails (ids, token, allDetails) {
	return new Promise((resolve, reject) => {
		request(`https://www.googleapis.com/youtube/v3/videos?part=${allDetails ? 'snippet, contentDetails' : 'contentDetails'}&id=${ids}&key=${token}`, {}, (error, response) => {
			if(error !== null) reject(error)    
			else resolve(JSON.parse(response.body))
		})
	})
}

function parseDuration (PT) {
	var durationInSec = 0
	var matches = PT.match(/P(?:(\d*)Y)?(?:(\d*)M)?(?:(\d*)W)?(?:(\d*)D)?T(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/i)
	var parts = [
		{ // years
			pos: 1,
			multiplier: 86400 * 365
		},
		{ // months
			pos: 2,
			multiplier: 86400 * 30
		},
		{ // weeks
			pos: 3,
			multiplier: 604800
		},
		{ // days
			pos: 4,
			multiplier: 86400
		},
		{ // hours
			pos: 5,
			multiplier: 3600
		},
		{ // minutes
			pos: 6,
			multiplier: 60
		},
		{ // seconds
			pos: 7,
			multiplier: 1
		}
	]
	
	for (var i = 0; i < parts.length; i++) {
		if (typeof matches[parts[i].pos] != 'undefined') {
			durationInSec += parseInt(matches[parts[i].pos]) * parts[i].multiplier
		}
	}
	
	return durationInSec
}

function calculateBestMatch (durations) {
	let bestMatch = 0
	for (let i = 1; i < durations.length; i++) {
		let dur = durations[i]
		if(dur < durations[bestMatch]) bestMatch = i
	}
	return bestMatch
}
