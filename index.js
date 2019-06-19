const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
// var request = require("request");
var token;

express()
.use(express.static(path.join(__dirname, 'public')))
.set('views', path.join(__dirname, 'views'))
.set('view engine', 'ejs')
.get('/random', (req, res) => res.render('pages/index'))
.listen(PORT, () => console.log(`Listening on ${ PORT }`))





// var options = 
// { 
//     method: 'POST',
//     url: 'https://accounts.spotify.com/api/token',
//     headers: 
//     { 
//         'Authorization': 'Basic  ODMzYmJmNDcxOGIzNDRiM2E5MTUxM2ViNmUwMGFmNzE6ODk0M2U4OGE5ODFmNGMzY2E3MTI4N2NjODM4ZTUzMmQ=' 
//     },
//     form: 
//     {
//         'grant_type': 'client_credentials'
//     } 
// };


// request(options, function (error, response, body) 
// {
//   if (error) throw new Error(error);
//   body = JSON.parse(body)
//   token = body.access_token;
//   console.log(token);
// });


// setInterval(() => {
  
//   request(options, function (error, response, body) 
//   {
//     if (error) throw new Error(error);
//     body = JSON.parse(body)
//     token = body.access_token;
//     console.log(token);
//   });
// }, 3600*1000);