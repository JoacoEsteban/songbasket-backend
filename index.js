const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var request = require("request");
const app = express();

var token;
const refresh_token = 'AQDF5jWtMdUAFTImnb1v1pZprK_aokOfgpdrOoCiZzV6kcUDcqNDQX5Z3nWNHvdeLgMhsxzIlOe_u4RhJpyXbNLC5d0b2xNc6JbGym8DUgEGwM4xMPTxLEphtjAn0Rl8ACwvEQ';
var access_token = 'BQDkuo9jM02xXHLEgZXyeFgRGDWwzWWwQhwYp05rJQiLALdeRCAYpbndXYfG6UlQ3ljIwFVeCF7nYUxELpjERaQivx6Re0Iwh1e3NWi6fnmi-5jLTAyJbUJ4fOq2nc26uvTLr71U9IvPMD5eXMnab2O5RXTqb9-t0Gye4BIUQCV8W2Tm7fE';

const SPOTIFY_API_ADDRESS = 'https://api.spotify.com/v1'

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.listen(PORT, () => console.log(`Listening on ${ PORT }`))

app.get('/', (req, res) => res.render('pages/index'))

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


app.get('/artist/:name', (req, res, next) => 
{
  const requestArtist = () => 
  {
    const { name } = req.params;

    request(
    {//Makes a spotify API Call with the artist name coming from the get request
      url:`${SPOTIFY_API_ADDRESS}/search?q=${name}&type=artist&limit=1`,
      headers: { Authorization: `Bearer ${token}` }
    }, (error, response, body) => 
    {
      if(error) return next(error);

      body = JSON.parse(body);
      if(body.artists.items.length === 0) return next(error);

      res.json(body);
    });
  }
  
  requestArtist();
  
});


app.get('/artist/:id/top-tracks', (req, res, next) => 
{
  const requestTopTracks = () => 
  {
    const { id } = req.params;
    
    request(
      {//maskes a spotify API Call with the artist id coming from the get request and responds with the top 10 tracks
        url:`${SPOTIFY_API_ADDRESS}/artists/${id}/top-tracks?country=US`,
        headers: { Authorization: `Bearer ${token}` }
      }, (error, response, body) => 
      {
        if(error) return next(error);
        
        body = JSON.parse(body);
        if(body.error !== undefined) return next(error);
        
        res.json(body);
      });
    }
    
    requestTopTracks();
    
  });
  
  
  app.get('/artist-with-tracks/:name', (req, res, next) =>
  {
    var object = 
    {
      artist:{},
      tracks:{}
    };
    
    const { name } = req.params;
    
    //FETCH ARTIST
    request(
      {//maskes a spotify API Call with the artist name coming from the get request
        url:`${SPOTIFY_API_ADDRESS}/search?q=${name}&type=artist&limit=1`,
        headers: { Authorization: `Bearer ${token}` }
      },
      
      (error, response, body) => 
      {
        if(error) return next(error);
        
        body = JSON.parse(body);
        if(body.artists.items.length === 0) return next(error);
        

        object.artist = body.artists;
    
        const id  = object.artist.items[0].id; //This is used to fetch the top tracks
    
    //FETCH TOP TRACKS
    request(
      {//maskes a spotify API Call with the artist id coming from the get request and responds with the top 10 tracks
        url:`${SPOTIFY_API_ADDRESS}/artists/${id}/top-tracks?country=US`,
        headers: { Authorization: `Bearer ${token}` }
      }, (error, response, body) => 
      
      {
        if(error) return next(error);

        object.tracks =JSON.parse(body).tracks;
        res.json(object); //Returns the object with both the artist and their top 10 tracks
      }
    );
  });

}); 



var options = 
{ 
    method: 'POST',
    url: 'https://accounts.spotify.com/api/token',
    headers: 
    { 
        'Authorization': 'Basic  ODMzYmJmNDcxOGIzNDRiM2E5MTUxM2ViNmUwMGFmNzE6ODk0M2U4OGE5ODFmNGMzY2E3MTI4N2NjODM4ZTUzMmQ=' 
    },
    form: 
    {
        'grant_type': 'client_credentials'
    } 
};

//Requests New token
request(options, function (error, response, body) 
{
  if (error) throw new Error(error);
  body = JSON.parse(body)
  token = body.access_token;
  console.log('New Token: ', token, '\n --------------------------------------------');
});

//Sets an interval in order to get a new token when the old one expires
setInterval(() => {
  
  request(options, function (error, response, body) 
  {
    if (error) throw new Error(error);
    body = JSON.parse(body)
    token = body.access_token;
    console.log('New Token: ', token, '\n --------------------------------------------');
  });
}, 3600*1000);