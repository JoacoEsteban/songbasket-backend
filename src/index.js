const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var request = require("request");
const app = express();
const SpotifyWebApi = require('spotify-web-api-node');
const uuid = require('uuid/v4');

var {CLIENT_ID, CLIENT_SECRET, SPOTIFY_LOGIN_URL, REDIRECT_URI} = require('./CONNECTION_DATA');
const {DB} = require('./DB')
const {logme} = require('./logme')


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

CCGrant(); //Gets Client Credentials Token and sets Interval
setInterval(() => {
  CCGrant();
}, 3600*1000);


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
      console.log('The token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);
      console.log('The refresh token is ' + data.body['refresh_token']);
  
      //Updates user to be pushed to database
      newUser.access_token = data.body['access_token'];
      newUser.refresh_token = data.body['refresh_token'];
      
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(newUser.access_token);
      spotifyApi.setRefreshToken(newUser.refresh_token);
    },
    function(err) {
      console.log('SOMETHING WENT WRONG!', err);
      res.redirect(301, 'http://localhost:5000/fail')
    })
    .then(()=>{
      //Gets New User's ID to push to DB 
      spotifyApi.getMe()
      .then(function(newUserData)
      {
        newUserData = newUserData.body;
        newUser.user_id = newUserData.id;
        newUser.SBID = uuid(); //SONGBASKET Unique ID for Authentication
        
        DB.publish(newUser); //Update database with New User
        
        res.set({
          user_id: newUser.user_id,
          SBID: newUser.SBID,
          success: true,
        });

        res.send()
      });

    });

  }else{
    logme('AQI TAMOS')
    res.redirect(301, 'http://localhost:5000/fail')
  }
})


app.get('/fail', (req, res) =>
{
  res.render('pages/access_denied', {url: SPOTIFY_LOGIN_URL})
})





app.get('/get_playlists', (req, res) => 
{
  var user_id = req.query.user_id;
  var logged = req.query.logged; //wheter it's a SB logged user
  var SBID = req.query.SBID; //SB User ID
  console.log('USER_ID:::', user_id, 'SB_ID:::', SBID);
  
  if(logged == 'true')
  {
    fetchPlaylists(res, user_id, true, SBID);
  }
  if(logged == 'false')
  {
    fetchPlaylists(res, user_id, false);
  }
  
});



function fetchPlaylists(res, user_id, logged, SBID)
{
  if(logged)
  {
    
    user = DB.getUserFromSBID(SBID); //Gets user from DB

    if(user === null){ //if user isn't in database return
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
      user_data.SBID = SBID;

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
          
          fetchPlaylists(res, user_id, true, SBID)
        },
        function(err) {
          console.log('Could not refresh access token', err);
        }
        );
      });
      
  }else //Guest fetching playlists
  {
    spotifyApiCC.getUserPlaylists(user.user_id)  
    .then(function(data)
    {
      console.log('Retrieved playlists', data.body);
      res.json({user: user_data, playlists: data.body});
    },function(err)
    {
      console.log('Something went wrong!', err);
    });

  }    
      
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










app.get('/', (req, res) => res.render('pages/success'));













function CCGrant()
{
  spotifyApiCC.clientCredentialsGrant().then(
    function(data) {
      console.log('The access token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);
      
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
    },
    function(err) {
      console.log('Something went wrong when retrieving an access token', err);
    }
    );
}
