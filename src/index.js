require('./env.config.js')
require('./controllers/Prototypes')
global.log = (...aa) => aa.forEach(a => console.log(require('util').inspect(a, { showHidden: false, depth: null })))


const express = require('express')
const serverless = require('serverless-http')
const path = require('path')
const helpers = require('./helpers')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

require('./routes/index.routes')(app)
require('./controllers/Telegram/telegram.controller').init()

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

module.exports.handler = serverless(app)
