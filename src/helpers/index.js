const e = module.exports

const PROD = e.ENV_PROD = process.env.PRODUCTION
const PORT = e.PORT = 5000


const baseSP = 'https://api.spotify.com/v1/'
const baseYT = 'https://www.googleapis.com/youtube/v3/'
e.PATHS = {
  www: (() => PROD ? 'https://www.songbasket.com' : 'http://localhost:?????')(), /* TODO define port */
  api: (() => PROD ? 'https://api.songbasket.com' : 'http://localhost:5000')(),
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
  youtubeVideoId: /^[a-zA-Z0-9-_]{11}$/,
  youtubeVideoUrl: /^https:\/\/www.youtube.com.watch\?v=([a-zA-Z0-9-_]{11})$/,
  spotifyPlaylistId: (txt) => txt.length === 22 && /[a-zA-Z0-9]{22}/.test(txt),
  spotifyUserId: (txt) => /[a-zA-Z0-9\._]+/.test(txt),
  spotifyTrackId: (txt) => /^[\w]{22}$/.test(txt),
  spotifySnapshotId: (txt) => /[a-zA-Z0-9+/=]/.test(txt)
}



const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_URI = `${e.PATHS.api}/handle_authorization/`
e.CREDENTIALS = {
  SPOTIFY: {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    SPOTIFY_LOGIN_URL: 'https://accounts.spotify.com/authorize?client_id=' +
      CLIENT_ID
    + '&response_type=' +
      'code'
    + '&redirect_uri=' +
      REDIRECT_URI
    + '&scope=' +
      'user-read-private+user-read-email+playlist-read-private'
    + '&show_dialog=' +
      'true'
    + '&state=' +
      '*SONGBASKET*'
  },
  YOUTUBE: {
    YOUTUBE_API_KEYS: process.env.YOUTUBE_API_KEYS.split(',')
  }
}

e.SPOTIFY_API_OPTIONS = {
  userPlaylistsLimit: 50,
  rawPlaylistFields: 'followers.total,id,snapshot_id,images,name,owner,public,description,tracks.total',
  trackFields: 'total,offset,next,' + [ 'is_local', 'items.track('+['id', 'name', 'duration_ms', 'external_urls', 'preview_url', 'artists(name, external_urls, id)', 'album(' + ['id', 'name', 'external_urls', 'images', 'name',].join(',') + ')'].join(',') + ')' ].join(',')
}

e.YOUTUBE_API_OPTIONS = {
  searchParams: {
    part: 'id',
    maxResults: 5,
    safeSearch: 'none',
    type: 'video',
  },
  videoDetailsParams: {
    part: 'snippet, contentDetails'
  }
}
