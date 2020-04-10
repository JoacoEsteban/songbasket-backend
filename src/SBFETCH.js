const express = require('express')
var request = require('request')
const { DB } = require('./controllers/DB')

module.exports = {
	SBFETCH: {
		GetUserPlaylists: function ({ user_id, offset }, access_token) {
			return new Promise((resolve, reject) => {
				request(`https://api.spotify.com/v1/users/${user_id}/playlists?limit=50&offset=${offset}`,
					{ headers: { Authorization: 'Bearer ' + access_token } },
					(algo, playlists) => resolve(JSON.parse(playlists.body)))
			})
		},
		GetPlaylistData: function (playlist_id, access_token) {
			console.log('a verrrrr', playlist_id)
			return new Promise((resolve, reject) => {
				request(`https://api.spotify.com/v1/playlists/${playlist_id}/?fields=collaborative,description,external_urls,followers,href,id,images,name,owner,public,snapshot_id,tracks(!items),type,uri`,
					{ headers: { Authorization: 'Bearer ' + access_token } }
					,(algo, playlist) => {
						playlist = JSON.parse(playlist.body)
						if (playlist.error) reject(playlist.error)
						resolve(playlist)
					})
			})
		},
		GetPlaylistTracks: function (playlist_id, tracksObject, offset, access_token) {
			return new Promise((resolve, reject) => {
				if(playlist_id === null || playlist_id === undefined) {
					reject('PLAYLIST ID NULL')
				}else{
					request(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks?fields=items.track(album(artists, external_urls, id, images, name), artists, name, duration_ms, id, track), total, offset&offset=${offset}`,
						{ headers: { Authorization: 'Bearer ' + access_token } }
						,(algo, tracks) => {
							tracks = JSON.parse(tracks.body)
							console.log('AMMOUNT OF ACCUMULATED TRACKS:: ' , tracksObject.length)

							for(let i = 0; i < tracks.items.length; i++){
								tracksObject = [...tracksObject, tracks.items[i].track]
							}

							// tracksObject = [...tracksObject, ...tracks.items]
							if (tracksObject.length < tracks.total) {

								console.log('RETRIEVING MORE SONGS::: ' + tracksObject.length + ' out of ' + tracks.total)
								this.GetPlaylistTracks(playlist_id, tracksObject, tracksObject.length, access_token).then(tracks => resolve(tracks))

							} else {
								console.log('Tracks Done::: ')
								console.log(`items: ${tracksObject}`)
								resolve(tracksObject)
							}
							// console.log(tracks)
						})
				}
			})
		},

		SearchTrackOnYT: function (track) {
			let query = `${track.name} ${track.artists[0].name}`
			let duration = track.duration_ms / 1000 / 60
			if(duration > 20) duration = 'long'
			if(duration <= 20 && duration >= 4) duration = 'medium'
			if(duration < 4) duration = 'short'

			return new Promise((resolve, reject) => {
				request(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${query}&safeSearch=none&type=video&videoDuration=${duration}&key=AIzaSyDAuJhKAP2HvSkYEwnLnN2_St6z8f04v-o`, {}, (error, response) => {
					if(error !== null) reject(error)
					else {
						let fullTrackData = {
							initial: JSON.parse(response.body)
						}
						resolve(fullTrackData)
					}
				})
			})
		}
	}
}
