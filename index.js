const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var request = require("request");
const app = express();
var SpotifyWebApi = require('spotify-web-api-node');

const SPOTIFY_LOGIN_URL = 'https://accounts.spotify.com/authorize?client_id=30e3ebd25fd04ac5b1e2dfe889fdc90c&response_type=code&redirect_uri=https://spotify-api-wrapper-joaco.herokuapp.com/&scope=user-read-private user-read-email playlist-read-private';


var token;
const refresh_token = 'AQDF5jWtMdUAFTImnb1v1pZprK_aokOfgpdrOoCiZzV6kcUDcqNDQX5Z3nWNHvdeLgMhsxzIlOe_u4RhJpyXbNLC5d0b2xNc6JbGym8DUgEGwM4xMPTxLEphtjAn0Rl8ACwvEQ';
var access_token = 'BQDkuo9jM02xXHLEgZXyeFgRGDWwzWWwQhwYp05rJQiLALdeRCAYpbndXYfG6UlQ3ljIwFVeCF7nYUxELpjERaQivx6Re0Iwh1e3NWi6fnmi-5jLTAyJbUJ4fOq2nc26uvTLr71U9IvPMD5eXMnab2O5RXTqb9-t0Gye4BIUQCV8W2Tm7fE';

var spotifyApi = new SpotifyWebApi({
  clientId: '30e3ebd25fd04ac5b1e2dfe889fdc90c',
  clientSecret: 'd01ade80ab7849ab999cb012654991df',
  redirectUri: 'https://spotify-api-wrapper-joaco.herokuapp.com/'
});

spotifyApi.setAccessToken('<your_access_token>');














app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.listen(PORT, () => console.log(`Listening on ${ PORT }`))

app.get('/', (req, res) => res.redirect('301', SPOTIFY_LOGIN_URL))

var nameGLOB;
var object;



















app.get('/temp-playlists', (req, res, next) =>
{
  console.log('Buscando Playlists.........')
  const user = 'joaqo.esteban';
  
  var responseBody;
  
  request(
    {
      url: `https://api.spotify.com/v1/users/${user}/playlists`,
      headers: {Authorization: `Bearer ${access_token}`}
    }, (error, response, body) =>
    {
      if(error) return next(error);
      
      responseBody = JSON.parse(body);
      if(responseBody.error !== undefined)
      {
        if(responseBody.error.message == 'The access token expired')
        {
          console.log('Getting New Access Token.........')
          request(
          {
            method: 'POST',
            url: 'https://accounts.spotify.com/api/token',
            headers:{
              //SongBasket client_id and secret BASE64 Encoded
              Authorization: `Basic MzBlM2ViZDI1ZmQwNGFjNWIxZTJkZmU4ODlmZGM5MGM6ZDAxYWRlODBhYjc4NDlhYjk5OWNiMDEyNjU0OTkxZGY=`, 
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            form:{
              grant_type: 'refresh_token',
              refresh_token: refresh_token,
            }
          },(error, response, body) =>
          {
            if(error) return next(error);

            body = JSON.parse(body);
            access_token = body.access_token;
            console.log(access_token);
          })
        }
      }  
    res.json(responseBody);
  })
});
