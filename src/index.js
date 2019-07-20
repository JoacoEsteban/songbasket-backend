const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var request = require("request");
const app = express();
const SpotifyWebApi = require('spotify-web-api-node');
const { SpotifyAPI } = require('./SpotiWrapper')
const { Nexus } = require('./Nexus')
const uuid = require('uuid/v4');

var { CLIENT_ID, CLIENT_SECRET, SPOTIFY_LOGIN_URL, BACKEND, REDIRECT_URI } = require('./CONNECTION_DATA');
const { DB } = require('./DB')
const { logme } = require('./logme')


var Wrapper = new SpotifyAPI({
	client_id: CLIENT_ID,
	client_secret: CLIENT_SECRET,
	redirect_uri: REDIRECT_URI
});







var spotifyApi = new SpotifyWebApi({
	clientId: CLIENT_ID,
	clientSecret: CLIENT_SECRET,
	redirectUri: REDIRECT_URI
});

//CLIENT CREDENTIALS To for Guest Users
var spotifyApiCC = new SpotifyWebApi({
	clientId: CLIENT_ID,
	clientSecret: CLIENT_SECRET,
});
var CCTOKEN;

CCGrant(); //Gets Client Credentials Token and sets a timeout


app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	next();
});

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

//USER NOT REGISTERED Redirect to Login URL
app.get('/init', (req, res) => res.redirect(301, SPOTIFY_LOGIN_URL));


//Arrives with Authorization Code
app.get('/handle_authorization', (req, res) => {
	var newUser = {}; //will store newUser data and then publish it to DB
	var authorizationCode = req.query.code;
	logme(`Authorization Code: ${authorizationCode}`);

	if (authorizationCode !== undefined)
	{
		//Get Access Token and Refresh Token
		Wrapper.authorizationCodeGrant(authorizationCode)
			.then(function ({access_token, refresh_token}) {

				//Updates user to be pushed to database
				newUser.access_token = access_token;
				newUser.refresh_token = refresh_token;
				newUser.token_created_at = Date.now();

				// Set the access token on the API object to use it in later calls
				Wrapper.setAccessToken(newUser.access_token);
				Wrapper.setRefreshToken(newUser.refresh_token);
			},
				function (err) {
					console.log('SOMETHING WENT WRONG! When retrieving User Access Tokens', err);
					res.redirect(301, `${BACKEND}/fail`)
				})
			.then(() => {
				//Gets New User's ID to push to DB 
				Wrapper.getMe()
					.then(function (newUserData) {

						console.log(newUserData)
						newUser.user_id = newUserData.id;

						newUser.SBID = DB.publish(newUser); //Update database with New User. The SBID Is Returned from inside the function

						res.set({
							user_id: newUser.user_id,
							SBID: newUser.SBID,
							success: true,
						});
						
						res.send()
					});

			});

	} else {
		res.redirect(301, `${BACKEND}/fail`)
	}
})


app.get('/fail', (req, res) => {
	res.render('pages/access_denied', { url: SPOTIFY_LOGIN_URL })
})





app.get('/retrieve', (req, res) => //TODO Changeit into post
{
	var requestParams =
	{
		user_id: req.query.user_id.trim() === '' ? false : req.query.user_id.trim(),
		logged: req.query.logged.trim() == 'false' ? false : req.query.logged.trim() == 'true' ? true : 'invalid', //wheter it's a SB logged user
		SBID: req.query.SBID.trim() === 'null' ? null : req.query.SBID.trim(), //SB User ID
		offset: parseInt(req.query.offset.trim()),

		//user playlists or playlist tracks
		retrieve: req.query.retrieve.trim(),
		retrieve_user: req.query.retrieve.trim() === 'true' ? true : req.query.retrieve.trim() === 'false' ? false : 'invalid',

		//in case of retrieving playlist tracks:
		playlist_id: req.query.playlist_id !== undefined ? req.query.playlist_id.trim() : null,
	}

	console.log(requestParams);

	//Request Validation

	var isValid = true;
	var reason = '';

	if (requestParams.user_id === false) {
		isValid = false;
		reason += 'User ID missing. ';
	}
	if (requestParams.logged === 'invalid') {
		isValid = false;
		reason += 'Logged parameter not provided. ';
	}
	if (requestParams.logged === true && requestParams.SBID === false) {
		isValid = false;
		reason += 'SongBasket ID (SBID) missing.';
	}



	if (!isValid) {
		res.status(400);
		res.set({
			reason
		})
		res.send();
	}


	if(requestParams.logged) {
		Nexus.checkUserAndUpdateWrapper(requestParams.SBID, Wrapper)
		.then(token => retrieveRedirect(res, requestParams, token) )
	}else retrieveRedirect(res, requestParams, CCTOKEN)
	


});


function retrieveRedirect(res, requestParams, token) //TOKEN Used only on guests, else using API Wrapper
{
	switch (requestParams.retrieve) {
		case 'playlists':
			fetchPlaylists(res, requestParams);
			break;

		case 'playlist_tracks':
			plMakeRequestTracks({ playlist_id: requestParams.playlist_id, token, callback: (playlist_id, tracks) => res.json({ playlist_id, tracks }) })
			break;
	}
}





function fetchPlaylists(res, { user_id, logged, SBID, offset }) {
	if (logged) {

		user = DB.getUserFromSBID(SBID); //Gets user from DB

		if (user === null) { //if user isn't in database return
			res.set({
				success: false,
				reason: 'user not logged in',

				user_id,
				logged,
				SBID,
				offset,
			});
			res.send();
		}


		spotifyApi.setAccessToken(user.access_token);
		spotifyApi.setRefreshToken(user.refresh_token);

		spotifyApi.getMe() //IF ACCESS TOKEN WORKS (also gets user info to respond to frontend)
			.then(function (user_data) {
				user_data = user_data.body;
				user_data.SBID = SBID;
				user_data.logged = logged;

				// Get Playlists
				plMakeRequest(user.user_id, offset, user.access_token, (playlists) => res.json({ user: user_data, playlists: playlists }))
			},
				function (err) { //IF IT'S EXPIRED, REQUEST A NEW ONE AND UPDATE IT IN THE DATABASE
					spotifyApi.refreshAccessToken().then(
						function (data) {
							console.log('The access token has been refreshed!');

							DB.updateToken(user_id, data.body['access_token']);
							spotifyApi.setAccessToken(token);

							fetchPlaylists(res, { user_id, logged, SBID, offset })
						},
						function (err) {
							console.log('Could not refresh access token', err);
						}
					);
				});

	} else //Guest fetching playlists
	{
		request(`https://api.spotify.com/v1/users/${user_id}`, { headers: { Authorization: 'Bearer ' + CCTOKEN } },
			(algo, response) => {
				response = JSON.parse(response.body);
				if (response.error !== undefined) //User Not Found
				{
					res.json({
						code: 404,
						success: true,
						reason: 'user not found',
						user_id: user_id,
					});
					res.send();
				}
				else {
					var guestUser = response; //User Profile Data
					guestUser.logged = logged; //false
					guestUser.SBID = null;


					//Get Playlists
					plMakeRequest(user_id, offset, CCTOKEN, (playlists) => res.json({ user: guestUser, playlists: playlists }))

				}
			})


	}

};

async function plMakeRequestTEMP(user_id, offset, token, callback) {
	let res = await request(`https://api.spotify.com/v1/users/${user_id}/playlists?limit=50&offset=${offset}`, { headers: { Authorization: 'Bearer ' + token } },
		(algo, playlists) => {
			playlists = JSON.parse(playlists.body)
			var index = 0;

			console.log('getting tracks: ', playlists)

			plMakeRequestTracks({ playlists, index, token, callback })
		})
}


async function plMakeRequest(user_id, offset, token, callback) {
	let res = await request(`https://api.spotify.com/v1/users/${user_id}/playlists?limit=50&offset=${offset}`, { headers: { Authorization: 'Bearer ' + token } },
		(algo, playlists) => callback(JSON.parse(playlists.body)))
}




async function plMakeRequestTracks({ playlist_id, token, callback }) {
	let res = await request(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks?fields=items.track(album(artists, external_urls, id, images, name), artists, name, duration_ms, id, track)&offset=${0}`, { headers: { Authorization: 'Bearer ' + token } },
		(algo, tracks) => {
			tracks = JSON.parse(tracks.body).items;
			console.log(tracks)
			callback(playlist_id, tracks);
		})
}





function CCGrant() {
	logme('RETRIEVING CC ACCESS TOKEN::::::::::')
	spotifyApiCC.clientCredentialsGrant().then(
		function (data) {
			logme('SUCCESS::::::::::')
			CCTOKEN = data.body['access_token'];
			console.log('The access token expires in ' + data.body['expires_in']);
			console.log('The access token is ' + data.body['access_token']);

			// Save the access token so that it's used in future calls
			spotifyApi.setAccessToken(data.body['access_token']);

			setTimeout(() => {
				CCGrant();
			}, 3600 * 1000);

		},
		function (err) {
			console.log('Something went wrong when retrieving an access token, Trying again in 10 seconds', err);

			setTimeout(() => {
				CCGrant();
			}, 10 * 1000);
		}
	);
}
