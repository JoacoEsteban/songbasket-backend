const helpers = require('../helpers')
const handlers = require('../helpers/handlers')
const CTR = require('../controllers/Spotify/spotify.controller') // short for controller duh


module.exports = app => {
  app.route('*')
    .get(handlers.checkAuth)

  app.get('/user/:user_id', CTR.getUser)
  app.get('/playlist/:playlist_id', CTR.getPlaylist)
}