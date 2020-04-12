const axios = require('axios')

const helpers = require('../../helpers')
const handlers = require('../../helpers/handlers')
const CREDS = helpers.CREDENTIALS.SPOTIFY
const BACKEND = helpers.PATHS.api
const DB = require('../DB')

const Wrapper = new require('./spotify.wrapper').SpotifyAPI({
  client_id: CREDS.CLIENT_ID,
  client_secret: CREDS.CLIENT_SECRET,
  redirect_uri: CREDS.REDIRECT_URI
})

const GuestWrapper = new require('./spotify.wrapper').SpotifyAPI({
  client_id: CREDS.CLIENT_ID,
  client_secret: CREDS.CLIENT_SECRET,
  redirect_uri: CREDS.REDIRECT_URI,
  logged: false
})
GuestWrapper.CCInit()

const API = axios.create({
  baseURL: 'https://api.spotify.com/v1/',
  timeout: 2000
})

const e = module.exports

e.init = (req, res) => {
  res.redirect(301, CREDS.SPOTIFY_LOGIN_URL)
}

e.authorize = async (req, res) => {
  const AUTH_CODE = req.query.code
  console.log(`\nAuthorization Code: ${AUTH_CODE}\n`)

  if (!AUTH_CODE) return res.redirect(301, `${BACKEND}/fail`)

  try {
    const {
      access_token,
      refresh_token,
      expires_in
    } = await Wrapper.authorizationCodeGrant(AUTH_CODE) // gets new user credentials

    Wrapper.setAccessToken(access_token)
    Wrapper.setRefreshToken(refresh_token)
    const user_data = await Wrapper.getMe()

    try {
      const songbasket_id = await DB.AUTH.createUser({
        spotify_id: user_data.id,
        access_token,
        refresh_token,
        token_expires_at: new Date(Date.now() + expires_in)
      })
      user_data.songbasket_id = songbasket_id
      res.set({
        spotify_authorization_success: true,
        user_data: JSON.stringify(user_data)
      }).send()
    } catch (error) {
      throw (error)
    }

  } catch (err) {
    console.error('SOMETHING WENT WRONG! When retrieving User Access Tokens', err)
    res.redirect(301, `${BACKEND}/fail`)
  }
}

e.fail = (req, res) => {
  res.render('pages/access_denied', {
    url: CREDS.SPOTIFY_LOGIN_URL
  })
}


e.guestData = (req, res) => { //Arrives with Authorization Code
  const {
    user_id
  } = req.query
  if (!user_id || user_id === 'null' || user_id === 'undefined' || user_id === null || user_id === undefined) return (() => {
    res.status(400)
    res.set({
      reason: 'username not provided'
    })
    res.send()
  })()

  GuestWrapper.setUserId(user_id)
  GuestWrapper.giveMe.user()
    .then(resp => {
      console.log('user:::::', resp)
      resp.status = 200
      res.json(resp)
    })
    .catch(err => {
      res.json(err)
      res.send()
    })
}

// ------------ revision 2 ------------
e.setCredentials = async (req, res, next) => {
  try {
    await Wrapper.setUser(req.user)
    API.defaults.headers.common['Authorization'] = 'Bearer ' + req.user.access_token
    next()
  } catch (error) {
    console.error(error)
    handlers.status.c500(res)
  }
}

e.getUserPlaylists = async (req, res) => {
  const url = `/users/${req.user.spotify_id}/playlists`

  try {
    const response = await API.get(url, {
      params: {
        limit: helpers.SPOTIFY_API_OPTIONS.userPlaylistsLimit,
        offset: req.query.offset || 0
      }
    })

    if (!(response && response.data)) throw new Error('Empty response')
    if (response.data.error) throw new Error(res.data.error)
    res.json(response.data)
  } catch (error) {
    console.error(error)
    handlers.status.c500(res, error)
  }
}

e.getPlaylist = (req, res) => {

}