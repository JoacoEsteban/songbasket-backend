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
const { DB } = require('./DB')
const { SBFETCH } = require('./SBFETCH')
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
	let {user_id} = req.query
	if(user_id === 'null' || user_id === 'undefined' || user_id === null || user_id === undefined){
		res.status(400)
		res.set({
			reason: 'username not provided'
		})
		res.send()
	}else{
		GuestWrapper.setUserId(user_id)
		GuestWrapper.giveMe.user()
			.then(resp => {
				console.log('user:::::', resp)
				resp.code = 200
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
	YouTubeWrapper.Youtubize(track)
		.then(conclusion => {
			console.log('Terminamo', conclusion)
			res.json(conclusion)
		})
		.catch(err => console.log(err))
})

app.get('/yt_details', (req, res) => {
	let {ytId} = req.query
	console.log('getting youtube details from ', ytId)
	let result = (/(https:\/\/www.youtube.com.watch\?v=)?([a-zA-Z0-9-_]{11})/).exec(ytId)
	if (result === null) {
		let reason = 'Invalid YouTube Url or ID'
		console.error(reason)
		res.status(400)
		return res.json({error: true, reason})
	}

	YouTubeWrapper.getDetails(result[2])
	.then(response => {
		console.log('details Retrieved')
		res.send(response)
	})
	.catch(err => {
		res.status(400)
		res.json({error: true, reason: err})
	})
})

app.get('/retrieve', (req, res) => {
	let query = req.query
	let requestParams = {
		retrieve: query.retrieve,
		logged: query.logged.trim() == 'true' ? true : false, //wheter it's a SB logged user
	}
	if(query.SBID) {
		requestParams.SBID = query.SBID.trim() === 'null' ? null : query.SBID.trim() //SB User ID
	}

	//Request Validation
	var isValid = true
	var reason = ''
	if (requestParams.logged === true && requestParams.SBID === null) {
		isValid = false
		reason += 'SongBasket ID (SBID) missing.'
	}

	switch (requestParams.retrieve) {
	case 'playlist_tracks':
		//in case of retrieving playlist tracks:
		requestParams = {
			...requestParams,
			playlist_id: query.playlist_id === undefined || query.playlist_id.trim() === 'null' ?  null : query.playlist_id.trim(),
			snapshot_id: query.snapshot_id === undefined || query.snapshot_id.trim() === 'null' ?  null : query.snapshot_id.trim()
		}
		
		if (requestParams.playlist_id === null) {
			isValid = false
			reason += 'playlist_id ID missing. '
		}

		break
		
	case 'playlists':
		requestParams = {
			...requestParams,
			user_id: query.user_id.trim() === '' ? false : query.user_id.trim(),
			offset: parseInt(query.offset.trim()),
			retrieve_user_data: query.retrieve.trim() === 'true' ? true : query.retrieve.trim() === 'false' ? false : 'invalid',
		}

		if (requestParams.user_id === false) {
			isValid = false
			reason += 'User ID missing. '
		}
		
		break
	}

	console.log('REQUEST PARAMS:::::', requestParams) 

	if (!isValid) {
		res.status(400)
		res.set({
			reason
		})
		res.send()
		console.log('Bad request, reason:', reason)
		return
	}

	if (!requestParams.logged) GuestWrapper.setUserId(requestParams.user_id)
	else {
		// TODO Handle logged user
	}

	retrieveRedirect(res, requestParams)
})


//TOKEN Used only on guests, else using API Wrapper
function retrieveRedirect(res, data) {			
	let CurrentWrapper	

	if (data.logged && data.logged !== 'invalid') { CurrentWrapper = Wrapper }
	else { CurrentWrapper = GuestWrapper }

	switch (data.retrieve) {
	case 'playlists':
		SBFETCH.GetUserPlaylists(data, CurrentWrapper.giveMe.access_token())
			.then(playlists => {
				if (data.retrieve_user_data) {
					CurrentWrapper.giveMe.user()
						.then(user => {
							res.json({ playlists, user, request: data, code: 200 })
						}, error => {
							console.log(error)
							res.json(error)
						})
				} else res.json({ playlists, request: data, code: 200 })
			}
			)

		break

	case 'playlist_tracks':
		SBFETCH.GetPlaylistData(data.playlist_id, CurrentWrapper.giveMe.access_token())
			.then(playlist => {
				if (data.snapshot_id) {
					if (data.snapshot_id === playlist.snapshot_id) {
						console.log('SAME VERSION')
						res.json({ playlist: {same_version: true}, request: data })
						return
					}
				}
				SBFETCH.GetPlaylistTracks(data.playlist_id, [], 0, CurrentWrapper.giveMe.access_token())
					.then(tracks => {
						console.log('Number of tracks Retireved: ', tracks.length)
						playlist.tracks.items = tracks
						res.json({ playlist, request: data })
					})
					.catch( error => {
						console.log('Error when retrieving PL Tracks from GetPlaylistTracks: ', error)
						playlist.tracks.items = null
						res.json({playlist, request: data})
					})
			})
			.catch( error => {
				console.log('Error when retrieving PL Data from GetPlaylistData: ', error)
				res.status(error.status)
				res.send()
				// res.json({playlist: null, error, request: data})
			})
		break

		//TODO
	case 'user_profile':
		// plMakeRequestTracks({ playlist_id: requestParams.playlist_id, token, callback: (playlist_id, tracks) => res.json({ playlist_id, tracks }) })
		break
	}
}




