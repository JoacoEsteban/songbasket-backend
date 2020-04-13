const helpers = require('../helpers')
const handlers = require('../helpers/handlers')
const CTR = require('../controllers/Youtube/youtube.controller') // short for controller duh


module.exports = app => {
  app.post('/youtubize', handlers.checkAuth, CTR.youtubize)
  app.get('/video/:ids', handlers.checkAuth, CTR.routeVideoDetails)
}
