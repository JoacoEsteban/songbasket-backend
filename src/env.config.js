const utils = require('./utils')
global.CONSTANTS = require('dotenv-flow').config().parsed
global.CONSTANTS.PRODUCTION = utils.parseBool(process.env.PRODUCTION)
global.CONSTANTS.PRODUCTION_DB = utils.parseBool(process.env.PRODUCTION_DB)

console.log(global.CONSTANTS)