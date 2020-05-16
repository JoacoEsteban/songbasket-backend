const utils = require('./utils')
global.CONSTANTS = process.env.PRODUCTION ? (() => ({
    YOUTUBE_API_KEYS: process.env.YOUTUBE_API_KEYS,
    SPOTIFY_CLIENT_ID: '30e3ebd25fd04ac5b1e2dfe889fdc90c',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_PORT: process.env.DATABASE_PORT,
    PRODUCTION: true,
    PRODUCTION_DB: true
}))() : require('dotenv-flow').config().parsed
global.CONSTANTS.PRODUCTION = utils.parseBool(process.env.PRODUCTION)
global.CONSTANTS.PRODUCTION_DB = utils.parseBool(process.env.PRODUCTION_DB)

global.CONSTANTS.BETA_ENABLED = true
