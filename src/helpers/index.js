const e = module.exports

const PROD = e.ENV_PROD = process.env.PRODUCTION
const PORT = e.PORT = 5000


const baseSP = 'https://api.spotify.com/v1/'
const baseYT = 'https://www.googleapis.com/youtube/v3/'
e.PATHS = {
  www: (() => PROD ? 'https://www.songbasket.com' : 'localhost:?????')(), /* TODO define port */
  api: (() => PROD ? 'https://api.songbasket.com' : 'localhost:5000')(),
  spotify: {
    base: baseSP,
    playlists: baseSP + 'playlists/',
    users: baseSP + 'users/'
  },
  youtube: {
    base: baseYT,
    search: baseYT + 'search/',
    videos: baseYT + 'videos/'
  }
}

const makeEmail = pre => pre + '@songbasket.com'
e.EMAILS = {
  makeEmail,
  base: makeEmail(''),
  app: makeEmail('app'),
  support: makeEmail('support'),
}

e.REGEX = {
  youtubeVideoId: /(https:\/\/www.youtube.com.watch\?v=)?([a-zA-Z0-9-_]{11})/,
  spotifyPlaylistId: (txt) => txt.length === 22 && /[a-zA-Z0-9]{22}/.test(txt),
  spotifyUserId: (txt) => /[a-zA-Z0-9\._]+/.test(txt),
  spotifySnapshotId: (txt) => /[a-zA-Z0-9+/=]/.test(txt)
}



const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
e.CREDENTIALS = {
  SPOTIFY: {
    CLIENT_ID,
    CLIENT_SECRET,
    SPOTIFY_LOGIN_URL: `https://accounts.spotify.com/authorize?client_id=${
      CLIENT_ID
    }&response_type=code&redirect_uri=${
      `${e.PATHS.api}/handle_authorization/
    `}&scope=${
      'user-read-private+user-read-email+playlist-read-private'
    }&show_dialog=${
      'true'
    }&state=${
      '*SONGBASKET*'
    }`
  },
  YOUTUBE: {
    YOUTUBE_API_KEYS: process.env.YOUTUBE_API_KEYS.split(',')
  }
}