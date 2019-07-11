const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var request = require("request");
const app = express();
const SpotifyWebApi = require('spotify-web-api-node');

var {CLIENT_ID, CLIENT_SECRET, SPOTIFY_LOGIN_URL, REDIRECT_URI} = require('./CONNECTION_DATA');
const {DB} = require('./DB')
const {logme} = require('./logme')


var spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

var USER_PROFILE;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.listen(PORT, () => console.log(`Listening on ${ PORT }`))

//USER NOT REGISTERED Redirect to Login URL
app.get('/init', (req, res) => res.redirect(301, SPOTIFY_LOGIN_URL));


//Arrives with Authorization Code
app.get('/handle_authorization', (req, res) => {
  var newUser = {}; //will store newUser data and then publish it to DB
  var authorizationCode = req.query.code;
  logme(`Authorization Code: ${authorizationCode}`);

  if(authorizationCode !== undefined) //TODO actually handle rejection from newUser
  {
    //Get Access Token and Refresh Token
    spotifyApi.authorizationCodeGrant(authorizationCode)
    .then(function(data) {
      // console.log('The token expires in ' + data.body['expires_in']);
      // console.log('The access token is ' + data.body['access_token']);
      // console.log('The refresh token is ' + data.body['refresh_token']);
  
      //Updates user to be pushed to database
      newUser.access_token = data.body['access_token'];
      newUser.refresh_token = data.body['refresh_token'];
      
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(newUser.access_token);
      spotifyApi.setRefreshToken(newUser.refresh_token);
    },
    function(err) {
      console.log('Something went wrong!', err);
      res.redirect(301, 'http://localhost:5000/fail')
    })
    .then(()=>{
      //Gets New User's ID to push to DB 
      spotifyApi.getMe()
      .then(function(newUserData)
      {
        newUserData = newUserData.body;
        newUser.user_id = newUserData.id;
        
        DB.publish(newUser); //Update database with New User
        
        res.set({
          display_name: newUserData.display_name,
          user_id: newUserData.id,
          success: true,
        });

        res.send()
      });

    });

  }else{
    res.redirect(301, 'http://localhost:5000/fail')
  }
  
  
  // res.render('pages/success')
})


app.get('/fail', (req, res) =>
{
  res.render('pages/access_denied', {url: SPOTIFY_LOGIN_URL})
})





app.get('/get_playlists', (req, res) => 
{
  var user_id = req.query.user_id; 
  console.log('USER_ID:::', user_id);
  
  //Get access token from database
  
  fetchPlaylists(res, user_id);
  
});



function fetchPlaylists(res, user_id)
{
  user = DB.getUserFromId(user_id); //Gets user from DB

  if(user === undefined){ //if user isn't in database return
    res.set({
      success: false,
      reason: 'user not logged in',
      user_id: user_id,
    });
    res.send();
  }


  spotifyApi.setAccessToken(user.access_token);
  spotifyApi.setRefreshToken(user.refresh_token);

  spotifyApi.getMe() //IF ACCESS TOKEN WORKS (also gets user info to respond to frontend)
  .then(function(user_data) 
  {
    user_data = user_data.body;
    
    spotifyApi.getUserPlaylists(user.user_id)  
    .then(function(data)
    {
      console.log('Retrieved playlists', data.body);
      res.json({user: user_data, playlists: data.body});
    },function(err) 
    {
      console.log('Something went wrong!', err);
    });
  
  }, function(err) { //IF IT'S EXPIRED, REQUEST A NEW ONE AND UPDATE IT IN THE DATABASE
    spotifyApi.refreshAccessToken().then(
      function(data) {
        console.log('The access token has been refreshed!');
        DB.updateToken(user_id, data.body['access_token']);

        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(token);
        
        fetchPlaylists(res, user_id)
      },
      function(err) {
        console.log('Could not refresh access token', err);
      }
      );
    });
    
    
    
  };
  


function getUserIndex(user_id)
{
  for(let i = 0; i < DATA_BASE.length; i++)
  {
    if(DATA_BASE[i].user_id === user_id)
    {
      return i;
    }
  }

  return false;
}


async function checkAccessToken( access_token )
{
  
}









app.get('/', (req, res) => res.render('pages/success'));

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
