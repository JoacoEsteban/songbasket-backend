const localBackend = 'http://localhost:5000';
const herokuBackend = 'https://songbasket-backend.herokuapp.com';
const Backend = localBackend;

const CLIENT_ID = '30e3ebd25fd04ac5b1e2dfe889fdc90c';
const CLIENT_SECRET = 'd01ade80ab7849ab999cb012654991df';
const REDIRECT_URI = `${Backend}/handle_authorization/`
const SCOPES = 'user-read-private+user-read-email+playlist-read-private'
const SHOW_DIALOG = 'true';
const STATE = '*SONGBASKET*';

exports.SPOTIFY_LOGIN_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}&show_dialog=${SHOW_DIALOG}&state=${STATE}`
exports.BACKEND = Backend;

exports.CLIENT_ID = CLIENT_ID;
exports.CLIENT_SECRET = CLIENT_SECRET;

exports.REDIRECT_URI = REDIRECT_URI;
exports.SCOPES =  SCOPES;
exports.SHOW_DIALOG = SHOW_DIALOG;