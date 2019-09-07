const express = require('express')
var request = require('request')
const { logme } = require('../logme')



module.exports = {
	YouTubeAPI: function ({ access_tokens }) {
		this.access_tokens = access_tokens
		this.current_access_token = {
			token: this.access_tokens[0],
			index: 0
		}
		
		// Sets token from array of tokens. Just pass the index
		this.setCurrentAccessToken = (index) => {
			this.current_access_token = {
				token: this.access_tokens[index],
				index
			}
			console.log('ACCESS TOKEN SET::: ' + this.current_access_token)
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
		}

		this.Youtubize = (playlists) => {
			console.log('YOUTUBIZING::: AMMOUNT OF PLAYLISTS', playlists.length)
			// Total number of tracks PER PLAYLIST
			let totalNumberOfTracks = 0
			// Total number of converted tracks PER PLAYLIST. To compare with total number and know when I'm finished
			let currentCountOfTracks = 0
			// videoIDS to fetch after query has been done
			let devolver = []

			return new Promise((resolve, reject) => {
				for(let i = 0; i < playlists.length; i++) {
					let pl = playlists[i]
					// Setting new playlist
					devolver = [...devolver, {id: pl.id, tracks: []}]	
					totalNumberOfTracks = pl.tracks.length

					for(let o = 0; o < totalNumberOfTracks; o++) {
						let track = pl.tracks[o]
						
						ytQuery(track, this.giveMe.current_access_token())
							.then(resp => {
								// TODO Upper the limit of tracks up to 10
								// TODO Then Fetch individual query results and pick best
								let q = resp.items
								// All 5 results
								let ytQueries = q.map(res => {
									return { id: res.id.videoId, snippet: res.snippet }
								})

								//Setting up videoIds in order to get length of videos
								let videoIds = ''
								ytQueries.forEach(vid => videoIds += vid.id + ',')
								videoIds = videoIds.substring(0, videoIds.length - 1)

								ytGetVideoDetails(videoIds, this.giveMe.current_access_token())
									.then(results => {
										// difference in duration respective to spotify track
										let trackDurations = results.items.map(t => {
											let vidDuration = parseDuration(t.contentDetails.duration) - track.duration_s
											return vidDuration > 0 ? vidDuration : vidDuration * -1
										})
										
										// Sets each video duration to have it at frontend
										ytQueries = ytQueries.map((q, index) => {
											return {...q, duration: trackDurations[index]}
										})
										
										// BestMatch based on difference in video length
										let bestMatch = ytQueries[calculateBestMatch(trackDurations)].id
										devolver[i].tracks.push({id: track.id, yt: ytQueries, bestMatch})

										currentCountOfTracks++

										// All tracks have been converted
										if (currentCountOfTracks === totalNumberOfTracks) {
											resolve(devolver)
										}
									})
									.catch(err => {
										console.log('ERROR WHEN GETTING VIDEO DURATIONS:::', err)
									})
							})
							.catch(err => {
								console.log('ERRORRRRR ON YTQUERY:::', err)
								reject(err)
							})
					}
				}
			})
		}

		this.giveMe = {
			current_access_token: () => this.current_access_token.token,
		}

		return this
	}
}

// Track object has query and duration included
function ytQuery ({query, duration}, token) {
	return new Promise((resolve, reject) => {
		request(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${query}&safeSearch=none&type=video&videoDuration=${duration}&key=${token}`, {}, (error, response) => {
			if(error !== null) reject(error)    
			else resolve(JSON.parse(response.body))
		})
	})
}

function ytGetVideoDetails (ids, token) {
	return new Promise((resolve, reject) => {
		request(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${token}`, {}, (error, response) => {
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