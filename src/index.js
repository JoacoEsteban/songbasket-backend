require('dotenv-flow').config()
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
let bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json()) // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })) // support encoded bodies

const { SpotifyAPI } = require('./Wrappers/SpotiWrapper')
const { YouTubeAPI } = require('./Wrappers/YouTubeWrapper')

let { CLIENT_ID, CLIENT_SECRET, SPOTIFY_LOGIN_URL, YOUTUBE_API_KEYS, BACKEND, REDIRECT_URI } = require('./CONNECTION_DATA')
if (YOUTUBE_API_KEYS.length === 0 || CLIENT_SECRET === '') return console.error('YOUTUBE API KEYS OR SPOTIFY CLIENT SECRET MISSING FROM .env FILE')
const { DB, CUSTOM } = require('./DB')
const { SBFETCH } = require('./SBFETCH')
const { parseBool } = require('./utils')
const regexValidation = require('./regexValidation')
const { logme } = require('./logme')

let Wrapper = new SpotifyAPI({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uri: REDIRECT_URI
})

let GuestWrapper = new SpotifyAPI({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  logged: false
})

let YouTubeWrapper = new YouTubeAPI({
  access_tokens: YOUTUBE_API_KEYS
})

// Gets Client Credentials Token and sets a timeout
GuestWrapper.CCInit()


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

//USER NOT REGISTERED Redirect to Login URL
app.get('/init', (req, res) => res.redirect(301, SPOTIFY_LOGIN_URL))


//Arrives with Authorization Code
app.get('/handle_authorization', (req, res) => {
  var newUser = {} //will store newUser data and then publish it to DB
  var authorizationCode = req.query.code
  logme(`Authorization Code: ${authorizationCode}`)

  if (authorizationCode !== undefined) {
    //Get Access Token and Refresh Token
    Wrapper.authorizationCodeGrant(authorizationCode)
      .then(function ({ access_token, refresh_token }) {

        //Updates user to be pushed to database
        newUser.access_token = access_token
        newUser.refresh_token = refresh_token
        newUser.token_created_at = Date.now()

        // Set the access token on the API object to use it in later calls
        Wrapper.setAccessToken(newUser.access_token)
        Wrapper.setRefreshToken(newUser.refresh_token)
      },
        function (err) {
          console.log('SOMETHING WENT WRONG! When retrieving User Access Tokens', err)
          res.redirect(301, `${BACKEND}/fail`)
        })
      .then(() => {
        //Gets New User's ID to push to DB 
        Wrapper.getMe()
          .then(function (newUserData) {

            console.log(newUserData)
            newUser.user_id = newUserData.id

            newUser.SBID = DB.publish(newUser) //Update database with New User. The SBID Is Returned from inside the function

            res.set({
              user_id: newUser.user_id,
              SBID: newUser.SBID,
              success: true,
            })

            res.send()
          })

      })

  } else {
    res.redirect(301, `${BACKEND}/fail`)
  }
})


app.get('/guest_sign_in', (req, res) => {
  let { user_id } = req.query
  if (user_id === 'null' || user_id === 'undefined' || user_id === null || user_id === undefined) {
    res.status(400)
    res.set({
      reason: 'username not provided'
    })
    res.send()
  } else {
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

})


app.get('/fail', (req, res) => {
  res.render('pages/access_denied', { url: SPOTIFY_LOGIN_URL })
})

// Post due to query weight limits
app.post('/youtubize', (req, res) => {
  let track = JSON.parse(req.body.track)
  console.log(track)
  DB.getAllFrom(track.id)
    .then(conversion => {
      if (conversion === false) {
        console.log('Track not cached, retrieving', track.id)
        YouTubeWrapper.Youtubize(track)
          .then(conclusion => {
            console.log('Track Retrieved', conclusion)
            DB.insertAllFrom(conclusion.id, conclusion.yt, conclusion.bestMatch)
              .then(() => {
                console.log('Track Cached')
              })
            res.json(conclusion)
          })
          .catch(err => console.error(err))
      } else {
        console.log('Track was found in DataBase')
        res.json(conversion)
      }
    })
    .catch(error => {
      console.error('ERROR WHEN CHECKING DB @index.js', error)
    })
})

app.get('/yt_details', async (req, res) => {
  let { ytId } = req.query
  console.log('getting youtube details from ', ytId)
  // TODO Forbid multiple matches with "$" at the end of regex
  let result = regexValidation.youtubeVideoId.exec(ytId)
  if (result === null) {
    let reason = 'Invalid YouTube Url or ID'
    console.error(reason)
    res.status(400)
    return res.json({ error: true, reason })
  }
  let id = result[2]
  let conversion = await CUSTOM.getById(id)
  if (conversion === false) {
    console.log('Custom track details not cached')
    YouTubeWrapper.getDetails(id)
    .then(response => {
      console.log('details Retrieved', response)
      res.send(response)
      CUSTOM.addReg(response.id, response.snippet, response.duration)
    })
    .catch(err => {
      console.error(err)
      res.status(400)
      res.json({ error: true, reason: err })
    })
  } else {
    console.log('details cached')
    res.send(conversion)
  }
})

app.get('/retrieve', (req, res) => {
  let query = req.query
  let requestParams = {
    retrieve: query.retrieve,
    logged: parseBool(query.logged), //wheter it's a SB logged user
  }

  //Request Validation
  var isValid = true
  var reason = []
  if (requestParams.logged && !query.SBID) {
    isValid = false
    reason.push('SongBasket ID (SBID) missing')
  } else {
    switch (requestParams.retrieve) {
      case 'playlist_tracks':
        //in case of retrieving playlist tracks:
        if (query.playlist_id && (query.playlist_id = query.playlist_id.trim()) !== 'undefined' && regexValidation.spotifyPlaylistId(query.playlist_id))  requestParams.playlist_id = query.playlist_id
        else {
          isValid = false
          reason.push(query.playlist_id ? 'playlist_id malformatted' : 'playlist_id ID missing')
        }

        if (isValid && query.snapshot_id && (query.snapshot_id = query.snapshot_id.trim()) !== 'undefined') {
          // Tests for snapshot_id validity
          if (regexValidation.spotifySnapshotId(query.snapshot_id)) requestParams.snapshot_id = query.snapshot_id
          else {
            isValid = false
            reason.push('snapshot_id ID malformatted')
          }
        }
        break
      case 'user_playlists':
        if (query.user_id && (query.user_id = query.user_id.trim()) !== 'undefined' && regexValidation.spotifyUserId(query.user_id)) requestParams.user_id = query.user_id
        else {
          isValid = false
          reason.push(query.user_id ? 'user_id malformatted' : 'user_id ID missing')
        }
        requestParams = {
          ...requestParams,
          offset: query.offset || 0,
          retrieve_user_data: parseBool(query.retrieve_user_data)
        }
        break
      default:
        isValid = false
        reason.push(requestParams.retrieve ? 'Unrecognized retrieve target "' + requestParams.retrieve + '"' : 'Retrieve target missing')
        break
    }
  }

  
  if (!isValid) {
    // reason = reason.join(', ')
    console.log('Bad request, reason:', reason, 'params:', requestParams)
    
    res.status(400)
    res.send({
      status: 400,
      reason
    })
    return
  }

  console.log('REQUEST PARAMS:::::', requestParams)

  if (!requestParams.logged) GuestWrapper.setUserId(requestParams.user_id)
  else {
    // TODO Handle logged user
  }
  let data = requestParams
  retrieveRedirect(res, data)
})


//TOKEN Used only on guests, else using API Wrapper
function retrieveRedirect(res, data) {
  let CurrentWrapper

  if (data.logged && data.logged !== 'invalid') { CurrentWrapper = Wrapper }
  else { CurrentWrapper = GuestWrapper }

  switch (data.retrieve) {
    case 'user_playlists':
      SBFETCH.GetUserPlaylists(data, CurrentWrapper.giveMe.access_token())
        .then(playlists => {
          if (data.retrieve_user_data) {
            GuestWrapper.setUserId(data.user_id)
            CurrentWrapper.giveMe.user()
              .then(user => {
                res.json({ playlists, user, request: data, status: 200 })
              }, error => {
                console.log(error)
                res.json(error)
              })
          } else res.json({ playlists, request: data, status: 200 })
        }
        )

      break

    case 'playlist_tracks':
      SBFETCH.GetPlaylistData(data.playlist_id, CurrentWrapper.giveMe.access_token())
        .then(playlist => {
          if (data.snapshot_id) {
            if (data.snapshot_id === playlist.snapshot_id) {
              console.log('SAME VERSION')
              res.json({ playlist: { same_version: true }, request: data })
              return
            }
          }
          SBFETCH.GetPlaylistTracks(data.playlist_id, [], 0, CurrentWrapper.giveMe.access_token())
            .then(tracks => {
              console.log('Number of tracks Retireved: ', tracks.length)
              playlist.tracks.items = tracks
              res.json({ playlist, request: data })
            })
            .catch(error => {
              console.log('Error when retrieving PL Tracks from GetPlaylistTracks: ', error)
              playlist.tracks.items = null
              res.json({ playlist, request: data })
            })
        })
        .catch(error => {
          console.log('Error when retrieving PL Data from GetPlaylistData: ', error)
          res.status(error.status)
          res.send(error)
          // res.json({playlist: null, error, request: data})
        })
      break

    //TODO
    case 'user_profile':
      // plMakeRequestTracks({ playlist_id: requestParams.playlist_id, token, callback: (playlist_id, tracks) => res.json({ playlist_id, tracks }) })
      break
  }
}




