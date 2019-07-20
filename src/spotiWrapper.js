const express = require('express')
var request = require("request");
const { logme } = require('./logme')



module.exports = {
	SpotifyAPI: function ({ client_id, client_secret, redirect_uri, logged }) {
		this.client_id = client_id;
		this.client_secret = client_secret;
		this.access_token = null;
		this.refresh_token = null;
		this.redirect_uri = redirect_uri;

		this.logged = logged;
		this.user_id = null;

		this.setAccessToken = (access_token) => {
			this.access_token = access_token
			console.log('ACCESS TOKEN SET::: ' + this.access_token)
		}; 
		this.setRefreshToken = (refresh_token) => {
			this.refresh_token = refresh_token;
			 console.log('REFRESH TOKEN SET::: ' + this.refresh_token)
			}
		this.setUserId = (user_id) => {
			this.user_id = user_id;
			 console.log('USER ID SET::: ' + this.user_id)}


		this.authorizationCodeGrant = (authorizationCode) => {
			var options = {
				url: 'https://accounts.spotify.com/api/token',
				method: 'POST',
				form: {
					grant_type: 'authorization_code',
					code: authorizationCode,
					redirect_uri: this.redirect_uri,
					client_id: this.client_id,
					client_secret: this.client_secret
				}
			}

			//TODO Handle Errors
			return new Promise((resolve, reject) => {
				request(options, (error, response, body) => {
					if (error) throw new Error(error);
					resolve(JSON.parse(body));
				})
			})
		}

		this.getMe = () => {
			var options = {
				method: 'GET',
				url: 'https://api.spotify.com/v1/me',
				headers:
				{
					//TODO Change into give.me func
					Authorization: 'Bearer ' + this.access_token,
				}
			};


			//TODO Handle Errors
			return new Promise((resolve, reject) => {
				request(options, (error, response, body) => {
					if (error) throw new Error(error);
					resolve(JSON.parse(response.body));
				})
			})
		}

		this.getUser = (user_id) => {
			return new Promise((resolve, reject) => {
				console.log('Getting user ', user_id)
				request(`https://api.spotify.com/v1/users/${user_id}`,
					{ headers: { Authorization: 'Bearer ' + this.giveMe.access_token() } },
					(algo, response) => {
						response = JSON.parse(response.body);
						if (response.error !== undefined) {
							console.log('ERROR: ', response.error)
							//User Not Found
							reject({
								code: 404,
								success: true,
								reason: 'user not found',
								user_id: user_id,
							});
						}else{
							resolve(response)
						}
					})
			})
		},



			this.refreshAccessToken = () => {
				var options = {
					method: 'POST',
					url: 'https://accounts.spotify.com/api/token',
					headers:
					{
						Authorization: 'Basic MzBlM2ViZDI1ZmQwNGFjNWIxZTJkZmU4ODlmZGM5MGM6ZDAxYWRlODBhYjc4NDlhYjk5OWNiMDEyNjU0OTkxZGY=',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					form:
					{
						grant_type: 'refresh_token',
						//TODO Change into give.me func
						refresh_token: this.refresh_token
					}
				};

				return new Promise((resolve, reject) => {
					request(options, function (error, response, body) {
						if (error) throw new Error(error);
						resolve(JSON.parse(response.body));
					});
				})

			},




			this.clientCredentialsGrant = () => {
				var options = {
					method: 'POST',
					url: 'https://accounts.spotify.com/api/token',
					headers:
					{
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: 'Basic  ' + this.giveMe.encoded()
					},
					form: { grant_type: 'client_credentials' }
				};

				return new Promise((resolve, reject) => {

					request(options, function (error, response, body) {
						if (error) throw new Error(error);

						resolve(JSON.parse(body));
					});
				})
			},




			this.CCInit = () => {

				logme('RETRIEVING CLIENT CREDENTIALS ACCESS TOKEN::::::::::')
				this.clientCredentialsGrant().then(
					(data) => {
						logme('SUCCESS, NEW CC ACCESS TOKEN IS ' + data.access_token + ' ::::::::::')

						// Save the access token so that it's used in future calls
						this.setAccessToken(data.access_token);


						setTimeout(() => {
							this.CCInit();
						}, 3540 * 1000);

					},
					(err) => {
						console.log('Something went wrong when retrieving an access token, Trying again in 10 seconds', err);

						setTimeout(() => {
							this.CCInit();
						}, 10 * 1000);
					}
				);
			},







			this.giveMe =
			{
				client_id: () => this.client_id,
				client_secret: () => this.client_secret,

				access_token: () => this.access_token,
				refresh_token: () => this.refresh_token,

				redirect_uri: () => this.redirect_uri,
				encoded: () => {
					let code = this.giveMe.client_id() + ':' + this.giveMe.client_secret()
					let buf = new Buffer.alloc(code.length, code)
					return buf.toString('base64')
				},
				user: () => {
					return new Promise((resolve, reject) => {
						if (this.user !== null) {
							this.getUser(this.user_id).then(user => resolve(user), error => reject(error))
						}
						else {
							this.getMe().then(user => resolve(user))
						}


					})
				}
			}


		return this
	}
}

