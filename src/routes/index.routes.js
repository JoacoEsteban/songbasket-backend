const helpers = require('../helpers')

module.exports = app => {
  app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    next()
  })

  app.all('/', (req, res) => {
    res.redirect(301, helpers.PATHS.www)
  })

  app.all('/ping', (req, res) => {
    res.status(200).send()
  })

  require('./auth.routes')(app)
  require('./spotify.routes')(app)
  require('./youtube.routes')(app)
}
