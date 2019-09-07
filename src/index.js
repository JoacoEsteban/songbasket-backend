const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json()) // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })) // support encoded bodies

const { SpotifyAPI } = require('./Wrappers/SpotiWrapper')
const { YouTubeAPI } = require('./Wrappers/YouTubeWrapper')
// const { Nexus } = require('./Nexus')

var { CLIENT_ID, CLIENT_SECRET, SPOTIFY_LOGIN_URL, BACKEND, REDIRECT_URI } = require('./CONNECTION_DATA')
const { DB } = require('./DB')
const { SBFETCH } = require('./SBFETCH')
const { logme } = require('./logme')


var Wrapper = new SpotifyAPI({
	client_id: CLIENT_ID,
	client_secret: CLIENT_SECRET,
	redirect_uri: REDIRECT_URI
})

var GuestWrapper = new SpotifyAPI({
	client_id: CLIENT_ID,
	client_secret: CLIENT_SECRET,
	logged: false
})

var YouTubeWrapper = new YouTubeAPI({
	access_tokens: ['AIzaSyDAuJhKAP2HvSkYEwnLnN2_St6z8f04v-o', 'AIzaSyA5MM5by6DZfJbDE9Wyeg22P5_JGxaymtU', 'AIzaSyBT-Q2Yt-bfiV43tCIZCdFydkaLKSLMbo8', 'AIzaSyBBHEGzV2tB1uvm0i4fPsDKgr9NP_TuI1s']
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

app.post('/youtubize', (req, res) => {
	let tracks = JSON.parse(req.body.tracks)
	// console.log(tracks)
	YouTubeWrapper.Youtubize(tracks)
		.then(conclusion => {
			console.log('Terminamo', conclusion[0].tracks)
			res.json(conclusion)
		})
		.catch(err => console.log(err))

})



app.get('/retrieve', (req, res) => {
	let query = req.query
	let requestParams

	console.log('tamo viendo 1')
	if (query.retrieve === 'youtubize') {
		console.log('tamo viendo 2')
		// TODO Implement this better
		requestParams = {
			retrieve: query.retrieve,
			tracks: JSON.parse(query.tracks),
			logged: false
		}
		retrieveRedirect(res, requestParams)
		return
	}
	else requestParams =
	{
		user_id: query.user_id.trim() === '' ? false : query.user_id.trim(),
		logged: query.logged.trim() == 'false' ? false : query.logged.trim() == 'true' ? true : 'invalid', //wheter it's a SB logged user
		SBID: query.SBID.trim() === 'null' ? null : query.SBID.trim(), //SB User ID
		offset: parseInt(query.offset.trim()),

		//user playlists or playlist tracks or user data
		retrieve: query.retrieve.trim(),
		retrieve_user_data: query.retrieve.trim() === 'true' ? true : query.retrieve.trim() === 'false' ? false : 'invalid',

		//in case of retrieving playlist tracks:
		playlist_id: query.playlist_id === undefined || query.playlist_id.trim() === 'null' ?  null : query.playlist_id.trim(),
	}

	console.log('REQUEST PARAMS:::::', requestParams) 

	//Request Validation

	var isValid = true
	var reason = ''

	if (requestParams.user_id === false) {
		isValid = false
		reason += 'User ID missing. '
	}
	if (requestParams.logged === 'invalid') {
		isValid = false
		reason += 'Logged parameter not provided. '
	}
	if (requestParams.logged === true && requestParams.SBID === false) {
		isValid = false
		reason += 'SongBasket ID (SBID) missing.'
	}



	if (!isValid) {
		res.status(400)
		res.set({
			reason
		})
		res.send()
	}

	if (!requestParams.logged) GuestWrapper.setUserId(requestParams.user_id)


	retrieveRedirect(res, requestParams)
})


//TOKEN Used only on guests, else using API Wrapper
function retrieveRedirect(res, data) {
	let CurrentWrapper

	if (data.logged) { CurrentWrapper = Wrapper }
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
		SBFETCH.GetPlaylistTracks(data.playlist_id, [], 0, CurrentWrapper.giveMe.access_token())
			.then(tracks => {
				console.log('Number of tracks Retireved: ', tracks.length)
				res.json({ tracks, request: data })
			})
			.catch( error => {
				console.log('Error when retrieving PL Tracks from GetPlaylistTracks: ', error)
				res.json({tracks:null, request: data})
			})
		break

		//TODO
	case 'youtube_convert':
		SBFETCH.SearchTrackOnYT(data.track)
			.then(track => {
				// console.log('YEYY', track)
				// console.log(util.inspect(track, {showHidden: false, depth: null}))
				let obj = {
					items: track.initial.items
				}
				console.log('about to send:: ', obj)
				res.json(obj)
			})
			.catch(error => {
				console.log('NOOO', error)
			})
		break

		//TODO
	case 'user_profile':
		// plMakeRequestTracks({ playlist_id: requestParams.playlist_id, token, callback: (playlist_id, tracks) => res.json({ playlist_id, tracks }) })
		break
	}
}




