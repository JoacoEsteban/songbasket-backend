const express = require('express')
var request = require('request')


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

		this.Youtubize = (playlists, accumulated) => {
			let devolver = [...accumulated]
			console.log('DOUUUUU::', this.giveMe.current_access_token())
			return new Promise((resolve, reject) => {

				YoutubizeFunction(playlists, this.giveMe.current_access_token())
					.then(done => {
						console.log('EVERYTHING DONE')
						resolve(done)
					})
					.catch(dou => {
						if(dou.reason === 'quota') {
							let {retrieved, retry} = dou
							console.log('Retrying with new token')

							if(devolver.length === 0) devolver = retrieved
							else {
								for (let i = 0; i < devolver.length; i++) {
									let oldPl = devolver[i]
									for (let o = 0; o < retrieved.length; o++) {
										let newPl = retrieved[o]

										if(oldPl.id === newPl.id) {
											devolver[i].tracks = [ ...devolver[i].tracks, ...newPl.tracks ]
											retrieved.splice(o, 1)
										}
									}
								}
								if(retrieved.length > 0) devolver = [...devolver, ...retrieved]
							}

							this.cycleAccessToken()
							this.Youtubize(retry, devolver)
								.then(tracks => resolve(tracks))
								.catch(err => reject(err))

						} else reject(dou.err)
					})
			})
		}

		this.giveMe = {
			current_access_token: () => this.current_access_token.token,
		}

		return this
	}
}


function YoutubizeFunction (playlists, token) {
	// Copy of playlists. Splices a track when completed so the array will be empty when all tracks have been retrieved
	let plControl = playlists.map(c => c.tracks.length).reduce((acc, cur) => acc+cur)
	let failed = {val: false, cont: 0} // If quota is exceeded this flag turns true, will cycle token and complete remaining requests
	// Queue of queries to retry if quota has been exceeded

	console.log('YOUTUBIZING::: AMMOUNT OF PLAYLISTS', playlists.length)
	let totalNumberOfPlaylists = playlists.length

	// Total number of tracks PER PLAYLIST
	let totalNumberOfTracks = playlists.map(pl=>pl.tracks.length)

	let devolver = []
	
	return new Promise((resolve, reject) => {
		for(let i = 0; i < totalNumberOfPlaylists; i++) {
			let PLAYLISTS_INDEX = i
			let pl = playlists[PLAYLISTS_INDEX]
			// Setting new playlist
			devolver = [...devolver, {id: pl.id, tracks: []}]

			for(let o = 0; o < totalNumberOfTracks[PLAYLISTS_INDEX]; o++) {
				let TRACKS_INDEX = o
				let track = pl.tracks[TRACKS_INDEX]
				// console.log('trakci', track)
				ytQuery(track, token)
					.then(resp => {
						let q = resp.items
						// All 5 results
						let ytQueries = q.map(res => {
							return { id: res.id.videoId, snippet: res.snippet }
						})

						//Setting up videoIds in order to get length of videos
						let videoIds = ''
						ytQueries.forEach(vid => videoIds += vid.id + ',')
						videoIds = videoIds.substring(0, videoIds.length - 1)

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
								devolver[PLAYLISTS_INDEX].tracks.push({id: track.id, yt: ytQueries, bestMatch, selected: bestMatch})

								// Track done. Removing it from control array
								plControl --

								// All tracks have been converted
								if(!failed.val) {
									let dots = ''
									for(let xd = 0; xd < plControl; xd++) dots += ':'
									console.log('Remaining', dots, 'Done =>', PLAYLISTS_INDEX, TRACKS_INDEX)
									if (plControl === 0) {
										console.log('All Tracks Retrieved')
										resolve(devolver)
									}
								}
							})
							.catch(err => {
								if(err.code === 403) {
									failed = {
										val: true,
										cont: failed.cont + 1
									}
									
									console.log('QUOTA EXCEEDED', failed.cont, plControl)
									// All tracks have been processed
									if (failed.cont - plControl === 0) {
										console.log('listo papu')
										let retry = [...playlists]
		
										for(let m = 0; m < retry.length; m++) {
											let pl = retry[m]
											let devpl = devolver[m]
											if(devpl) {
												for(let l = 0; l < devpl.tracks.length; l++) {
													for(let q = 0; q < pl.tracks.length; q++) {
														if (devpl.tracks[l].id === pl.tracks[q].id) {
															retry[m].tracks.splice(q, 1)
															break
														}
													}
												}
												
											}
		
										}
										reject({reason: 'quota', retrieved: devolver, retry})
									}
								} else {
									console.log('ERROR WHEN GETTING VIDEO DURATIONS:::', err)
									reject({reason: 'else', err})
								}
		
							})
					})
					.catch(err => {
						if(err.code === 403) {
							failed = {
								val: true,
								cont: failed.cont + 1
							}
							
							console.log('QUOTA EXCEEDED', failed.cont, plControl)
							// All tracks have been processed
							if (failed.cont - plControl === 0) {
								console.log('listo papu')
								let retry = [...playlists]

								for(let m = 0; m < retry.length; m++) {
									let pl = retry[m]
									let devpl = devolver[m]
									if(devpl) {
										for(let l = 0; l < devpl.tracks.length; l++) {
											for(let q = 0; q < pl.tracks.length; q++) {
												if (devpl.tracks[l].id === pl.tracks[q].id) {
													retry[m].tracks.splice(q, 1)
													break
												}
											}
										}
										
									}

								}
								reject({reason: 'quota', retrieved: devolver, retry})
							}
						} else {
							console.log('ERRORRRRR ON YTQUERY. TRACK:::', track, 'ERROR::', err)
							reject({reason: 'else', err})
						}
					})
			}
		}
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