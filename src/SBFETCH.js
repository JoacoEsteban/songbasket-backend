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
        }
    },

    GetPlaylistTracks: function (playlist_id, tracksObject, access_token) {
        return new Promise((resolve, reject) => {
            request(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks?fields=items.track(album(artists, external_urls, id, images, name), artists, name, duration_ms, id, track)&offset=${0}`,
                { headers: { Authorization: 'Bearer ' + access_token } },
                (algo, tracks) => resolve(JSON.parse(tracks.body)))
        })
    }

}


