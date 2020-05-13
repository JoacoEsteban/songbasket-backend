require('./env.config.js')
global.IS_DEV = !global.CONSTANTS.PRODUCTION // TODO apply this in prod
global.log = (...aa) => aa.forEach(a => console.log(require('util').inspect(a, {showHidden: false, depth: null})))


const express = require('express')
const serverless = require('serverless-http')
const path = require('path')
const helpers = require('./helpers')
const PORT = global.CONSTANTS.PORT || helpers.PORT
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

require('./routes/index.routes')(app)

module.exports.handler = serverless(app);