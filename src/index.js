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
const { SBFETCH } = require('./SBFETCH')
const { logme } = require('./logme')


var Wrapper = new SpotifyAPI({
	client_id: CLIENT_ID,
	client_secret: CLIENT_SECRET,
	redirect_uri: REDIRECT_URI
});

var GuestWrapper = new SpotifyAPI({
	client_id: CLIENT_ID,
	client_secret: CLIENT_SECRET,
});

//Gets Client Credentials Token and sets a timeout
GuestWrapper.CCInit()


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

	if (authorizationCode !== undefined) {
		//Get Access Token and Refresh Token
		Wrapper.authorizationCodeGrant(authorizationCode)
			.then(function ({ access_token, refresh_token }) {

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





app.get('/retrieve', (req, res) => {
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


	if (requestParams.logged) {
		Nexus.checkUserAndUpdateWrapper(requestParams.SBID, Wrapper)
			.then(() => retrieveRedirect(res, requestParams, Wrapper))
	} else retrieveRedirect(res, requestParams, GuestWrapper)
});


//TOKEN Used only on guests, else using API Wrapper
function retrieveRedirect(res, requestParams, Wrapper) {
	switch (requestParams.retrieve) {
		case 'playlists':
			Wrapper.getMe()
			.then(user =>{
				SBFETCH.GetUserPlaylists(requestParams, Wrapper).then(playlists => res.json({ playlists, user}) )
				
			})
			break;

		case 'playlist_tracks':
			plMakeRequestTracks({ playlist_id: requestParams.playlist_id, token, callback: (playlist_id, tracks) => res.json({ playlist_id, tracks }) })
			break;

		//TODO
		case 'user_profile':
			// plMakeRequestTracks({ playlist_id: requestParams.playlist_id, token, callback: (playlist_id, tracks) => res.json({ playlist_id, tracks }) })
			break;
	}
}





function fetchPlaylists(res, { user_id, logged, SBID, offset }) {
	if (logged) {
				// Get Playlists
				plMakeRequest(user.user_id, offset, user.access_token, (playlists) => res.json({ user: user_data, playlists: playlists }))

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



async function plMakeRequestTracks({ playlist_id, token, callback }) {
	let res = await request(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks?fields=items.track(album(artists, external_urls, id, images, name), artists, name, duration_ms, id, track)&offset=${0}`, { headers: { Authorization: 'Bearer ' + token } },
		(algo, tracks) => {
			tracks = JSON.parse(tracks.body).items;
			console.log(tracks)
			callback(playlist_id, tracks);
		})
}




