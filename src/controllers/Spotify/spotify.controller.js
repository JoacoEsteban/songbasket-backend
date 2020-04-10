const helpers = require('../../helpers')
const CREDS = helpers.CREDENTIALS.SPOTIFY
const BACKEND = helpers.PATHS.api

Wrapper = new require('./spotify.wrapper').SpotifyAPI({
  client_id: CREDS.CLIENT_ID,
  client_secret: CREDS.CLIENT_SECRET,
  redirect_uri: CREDS.REDIRECT_URI
})

let GuestWrapper = new require('./spotify.wrapper').SpotifyAPI({
  client_id: CREDS.CLIENT_ID,
  client_secret: CREDS.CLIENT_SECRET,
  logged: false
})

// Gets Client Credentials Token and sets a timeout
GuestWrapper.CCInit()
const e = module.exports

e.init = (req, res) => res.redirect(301, CREDS.SPOTIFY_LOGIN_URL)

e.authorize = async (req, res) => {
  const AUTH_CODE = req.query.code
  logme(`Authorization Code: ${AUTH_CODE}`)

  if (!AUTH_CODE) return res.redirect(301, `${BACKEND}/fail`)

  try {
    const { access_token, refresh_token } = await Wrapper.authorizationCodeGrant(AUTH_CODE) // gets new user credentials

      //Updates user to be pushed to database
      newUser.access_token = access_token
      newUser.refresh_token = refresh_token
      newUser.token_created_at = Date.now()

      // Set the access token on the API object to use it in later calls
      Wrapper.setAccessToken(newUser.access_token)
      Wrapper.setRefreshToken(newUser.refresh_token)
      //Gets New User's ID to push to DB 
      const newUserData = await Wrapper.getMe()

      console.log(newUserData)
      newUser.user_id = newUserData.id

      newUser.SBID = DB.publish(newUser) //Update database with New User. The SBID Is Returned from inside the function

      res.set({
        user_id: newUser.user_id,
        SBID: newUser.SBID,
        success: true,
      })

      res.send()

    } catch (err) {
      console.error('SOMETHING WENT WRONG! When retrieving User Access Tokens', err)
      return res.redirect(301, `${BACKEND}/fail`)
    }
}

e.fail = (req, res) => {
  res.render('pages/access_denied', {
    url: spoti.SPOTIFY_LOGIN_URL
  })
}


e.guestData = (req, res) => { //Arrives with Authorization Code
  const { user_id } = req.query
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

// TODO this
e.getUser = (req, res) => {
}

e.getPlaylist = (req, res) => {

}
