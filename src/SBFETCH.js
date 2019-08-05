const express = require('express')
var request = require("request");
const { logme } = require('./logme')

const { DB } = require('./DB')

module.exports = {
    SBFETCH: {
        GetUserPlaylists: function ({ user_id, offset }, access_token) {
            return new Promise((resolve, reject) => {
                request(`https://api.spotify.com/v1/users/${user_id}/playlists?limit=50&offset=${offset}`,
                    { headers: { Authorization: 'Bearer ' + access_token } },
                    (algo, playlists) => resolve(JSON.parse(playlists.body)))
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
        }

    }
}


