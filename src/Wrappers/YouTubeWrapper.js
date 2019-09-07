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
			// Total number of tracks
			let totalNumberOfTracks = 0
			// Total number of converted tracks. To compare with total number and know when I'm finished
			let currentCountOfTracks = 0
			// Array with playlists and their track conversions
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
								let q = resp.items[0]
								devolver[i].tracks.push({id: track.id, yt: {
									id: q.id.videoId,
									snippet: q.snippet
								}})

								currentCountOfTracks++
								// All tracks have been converted
								if (currentCountOfTracks === totalNumberOfTracks) {
									resolve(devolver)
								}
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
		request(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${query}&safeSearch=none&type=video&videoDuration=${duration}&key=${token}`, {}, (error, response) => {
			if(error !== null) reject(error)    
			else resolve(JSON.parse(response.body))
		})
	})
}

