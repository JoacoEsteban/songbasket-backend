const helpers = require('../helpers')
const handlers = require('../helpers/handlers')
const CTR = require('../controllers/Youtube/youtube.controller') // short for controller duh

const auth = [handlers.checkAuth, CTR.checkQuota]
module.exports = app => {
  app.post('/youtubize', auth, CTR.youtubize)
  app.get('/video/:ids', auth, CTR.routeVideoDetails)
}
