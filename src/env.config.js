const utils = require('./utils')
global.CONSTANTS = process.env.PRODUCTION ? (() => {
  return {
    YOUTUBE_API_KEYS: process.env.YOUTUBE_API_KEYS,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_PORT: process.env.DATABASE_PORT,
    PRODUCTION: true,
    PRODUCTION_DB: true
  }
})() : require('dotenv-flow').config().parsed
global.CONSTANTS.PRODUCTION = utils.parseBool(process.env.PRODUCTION)
global.CONSTANTS.PRODUCTION_DB = utils.parseBool(process.env.PRODUCTION_DB)

console.log('test', require('dotenv-flow').config(), '\n\n')