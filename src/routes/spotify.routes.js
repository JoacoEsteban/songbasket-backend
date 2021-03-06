const helpers = require('../helpers')
const handlers = require('../helpers/handlers')
const CTR = require('../controllers/Spotify/spotify.controller') // short for controller duh

const authAndSetCreds = [handlers.checkAuth, CTR.setCredentials]
module.exports = app => {
  app.get('/me', authAndSetCreds, CTR.getMe)
  app.get('/user/:user_id/playlists', authAndSetCreds, CTR.getUserPlaylists)
  app.get('/playlists/:playlist_id', authAndSetCreds, CTR.getPlaylist)
}
