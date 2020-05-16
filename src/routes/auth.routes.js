const helpers = require('../helpers')
const CTR = require('../controllers/Spotify/spotify.controller') // short for controller duh


module.exports = app => {
  app.get('/init', CTR.init)
  app.get('/handle_authorization', CTR.authorize)
  // app.get('/guest_sign_in', CTR.guestData)
  app.get('/fail', CTR.fail)
}