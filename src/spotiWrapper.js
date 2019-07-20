const express = require('express')
var request = require("request");



module.exports = {
	SpotifyAPI: function ({ client_id, client_secret, redirect_uri }) {
		this.client_id = client_id;
		this.client_secret = client_secret;
		this.access_token = undefined;
		this.refresh_token = undefined;
		this.redirect_uri = redirect_uri;

		this.setAccessToken = (access_token) => this.access_token = access_token;
		this.setRefreshToken = (refresh_token) => this.refresh_token = refresh_token;


		this.authorizationCodeGrant = (authorizationCode) => {
			var options = {
				url: 'https://accounts.spotify.com/api/token',
				method: 'POST',
					form:{ 
						grant_type: 'authorization_code',
						code: authorizationCode,
						redirect_uri: this.redirect_uri,
						client_id: this.client_id,
						client_secret: this.client_secret
					}
			}

			//TODO Handle Errors
			return new Promise((resolve, reject) => 
			{
				request(options, (error, response, body) => 
				{
					if(error) throw new Error(error);
					resolve(JSON.parse(body));
				})
			})
		}
		
		this.getMe = () =>
		{
			var options = { method: 'GET',
			url: 'https://api.spotify.com/v1/me',
			headers: 
			{ 
				Authorization: 'Bearer ' + this.access_token, 
			} };
			
			
			//TODO Handle Errors
			return new Promise((resolve, reject) => 
			{
				request(options, (error, response, body) => 
				{
					if(error) throw new Error(error);
					resolve(JSON.parse(response.body));
				})
			})
		}
		
		
		
		this.refreshAccessToken = () => {
			var options = { method: 'POST',
			url: 'https://accounts.spotify.com/api/token',
			headers: 
			{ 
				Authorization: 'Basic MzBlM2ViZDI1ZmQwNGFjNWIxZTJkZmU4ODlmZGM5MGM6ZDAxYWRlODBhYjc4NDlhYjk5OWNiMDEyNjU0OTkxZGY=',
				'Content-Type': 'application/x-www-form-urlencoded' },
				form: 
				{ 
					grant_type: 'refresh_token',
					refresh_token:  this.refresh_token
				} };
				
			return new Promise((resolve, reject) => 
			{
				request(options, function (error, response, body)
				{
					if (error) throw new Error(error);
					resolve(JSON.parse(response.body));
				});
			})

		},
		
		
		
		
		
		
		this.giveMe =
		{
			client_secret: () => this.client_secret,
			client_id: () => this.client_id,
			redirect_uri: () => this.redirect_uri,
		}
		
		
		return this
	}
}

