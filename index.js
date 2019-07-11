const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var request = require("request");
const app = express();
const SpotifyWebApi = require('spotify-web-api-node');

var {CLIENT_ID, CLIENT_SECRET, SPOTIFY_LOGIN_URL, REDIRECT_URI} = require('./CONNECTION_DATA');
const {logme} = require('./logme')

var DATA_BASE = new Array();

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
  var user = {};
  var authorizationCode = req.query.code;
  console.log('Code: ', authorizationCode);

  if(authorizationCode !== undefined)
  {
    //Get Access Token and Refresh Token
    var options = 
    { 
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
      
      form: 
      { 
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: 'http://localhost:5000/handle_authorization/',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      } 
    };

    request(options, function (error, response, body) {
    if (error) throw new Error(error);

    body = JSON.parse(body);
    console.log(body);

    access_token = body.access_token;
    refresh_token = body.refresh_token;
    
    user.access_token = access_token;
    user.refresh_token = refresh_token;
    
    //Gets User data
    request({
      url: 'https://api.spotify.com/v1/me',
      headers:{Authorization: `Bearer ${user.access_token}`},
    }, (error, response, body) =>{
      if(error) throw new Error(error);
      USER_PROFILE = JSON.parse(body);
      console.log(USER_PROFILE);
      user.user_id = USER_PROFILE.id;

      DATA_BASE.push(user);
      console.log('DATABASE-UPDATE: ', DATA_BASE)
      

      res.redirect(301, 'http://localhost:5000/login_success');

      // res.send(user.profile);
    })
    
    });
  }


  // res.render('pages/success')
})


app.get('/login_success', (req, res) =>
{

  res.set({
    display_name: USER_PROFILE.display_name,
    country: USER_PROFILE.country,
    email: USER_PROFILE.email,
    user_id: USER_PROFILE.id,
  });
  res.render('pages/success')
  // res.send();
})





app.get('/get_playlists', (req, res) => 
{
  var user_id = req.query.user_id; 
  console.log('USER_ID:::', user_id);
  
  //Get access token from database
  var userIndex = getUserIndex(user_id);
  console.log('USER:::', DATA_BASE[userIndex]);
  if(userIndex === false){ // TODO handle user not being found
  }
  
  fetchPlaylists(res, userIndex);
  
});



function fetchPlaylists(res, userIndex)
{
  user = DATA_BASE[userIndex]
  spotifyApi.setAccessToken(user.access_token);
  spotifyApi.setRefreshToken(user.refresh_token);

  spotifyApi.getMe() //IF ACCESS TOKEN WORKS
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
        

        updateToken(userIndex, data.body['access_token']);
        
        fetchPlaylists(res, userIndex)
      },
      function(err) {
        console.log('Could not refresh access token', err);
      }
      );
    });
    
    
    
  };
  
function updateToken(userIndex, token)
{
  DATA_BASE[userIndex].access_token = token; //Updates token from database
  
  // Save the access token so that it's used in future calls
  spotifyApi.setAccessToken(token);

}

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
