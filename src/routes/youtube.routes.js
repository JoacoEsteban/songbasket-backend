const helpers = require('../helpers')
const handlers = require('../helpers/handlers')
const CTR = require('../controllers/Youtube/youtube.controller') // short for controller duh


module.exports = app => {
  app.route('*')
    .get(handlers.checkAuth)

  app.post('/youtubize', CTR.youtubize)
  app.get('/yt_details', CTR.videoDetails)

}