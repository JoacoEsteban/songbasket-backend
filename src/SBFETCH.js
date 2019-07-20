const express = require('express')
var request = require("request");
const { logme } = require('./logme')

const { DB } = require('./DB')

module.exports = {
    SBFETCH: {
        GetUserPlaylists: function ({user_id, offset}, Wrapper) {
            return new Promise((resolve, reject) => {
                request(`https://api.spotify.com/v1/users/${user_id}/playlists?limit=50&offset=${offset}`,
                    { headers: { Authorization: 'Bearer ' + Wrapper.giveMe.access_token() } },
                    (algo, playlists) => resolve(JSON.parse(playlists.body)))
            })
        }
    }
}


