const Backend = process.env.BACKEND

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_URI = `${Backend}/handle_authorization/`
const SCOPES = 'user-read-private+user-read-email+playlist-read-private'
const SHOW_DIALOG = 'true'
const STATE = '*SONGBASKET*'

exports.YOUTUBE_API_KEYS = process.env.YOUTUBE_API_KEYS.split(',')
exports.SPOTIFY_LOGIN_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}&show_dialog=${SHOW_DIALOG}&state=${STATE}`
exports.BACKEND = Backend

exports.CLIENT_ID = CLIENT_ID
exports.CLIENT_SECRET = CLIENT_SECRET

exports.REDIRECT_URI = REDIRECT_URI
exports.SCOPES =  SCOPES
exports.SHOW_DIALOG = SHOW_DIALOG