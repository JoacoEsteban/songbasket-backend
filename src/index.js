require('dotenv-flow').config()

const express = require('express')
const path = require('path')
const helpers = require('./helpers')
const PORT = process.env.PORT || helpers.PORT
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.listen(PORT, () => console.log(`Listening on ${PORT}`))

require('./routes/index.routes')(app)

// app.get('/retrieve', (req, res) => {
//   let query = req.query
//   let requestParams = {
//     retrieve: query.retrieve,
//     logged: parseBool(query.logged), //wheter it's a SB logged user
//   }

//   //Request Validation
//   var isValid = true
//   var reason = []
//   if (requestParams.logged && !query.SBID) {
//     isValid = false
//     reason.push('SongBasket ID (SBID) missing')
//   } else {
//     switch (requestParams.retrieve) {
//       case 'playlist_tracks':
//         //in case of retrieving playlist tracks:
//         if (query.playlist_id && (query.playlist_id = query.playlist_id.trim()) !== 'undefined' && regexValidation.spotifyPlaylistId(query.playlist_id))  requestParams.playlist_id = query.playlist_id
//         else {
//           isValid = false
//           reason.push(query.playlist_id ? 'playlist_id malformatted' : 'playlist_id ID missing')
//         }

//         if (isValid && query.snapshot_id && (query.snapshot_id = query.snapshot_id.trim()) !== 'undefined') {
//           // Tests for snapshot_id validity
//           if (regexValidation.spotifySnapshotId(query.snapshot_id)) requestParams.snapshot_id = query.snapshot_id
//           else {
//             isValid = false
//             reason.push('snapshot_id ID malformatted')
//           }
//         }
//         break
//       case 'user_playlists':
//         if (query.user_id && (query.user_id = query.user_id.trim()) !== 'undefined' && regexValidation.spotifyUserId(query.user_id)) requestParams.user_id = query.user_id
//         else {
//           isValid = false
//           reason.push(query.user_id ? 'user_id malformatted' : 'user_id ID missing')
//         }
//         requestParams = {
//           ...requestParams,
//           offset: query.offset || 0,
//           retrieve_user_data: parseBool(query.retrieve_user_data)
//         }
//         break
//       default:
//         isValid = false
//         reason.push(requestParams.retrieve ? 'Unrecognized retrieve target "' + requestParams.retrieve + '"' : 'Retrieve target missing')
//         break
//     }
//   }

  
//   if (!isValid) {
//     // reason = reason.join(', ')
//     console.log('Bad request, reason:', reason, 'params:', requestParams)
    
//     res.status(400)
//     res.error({
//       status: 400,
//       reason
//     })
//     return
//   }

//   console.log('REQUEST PARAMS:::::', requestParams)

//   if (!requestParams.logged) GuestWrapper.setUserId(requestParams.user_id)
//   else {
//     // TODO Handle logged user
//   }
//   let data = requestParams
//   retrieveRedirect(res, data)
// })


// //TOKEN Used only on guests, else using API Wrapper
// function retrieveRedirect(res, data) {
//   let CurrentWrapper

//   if (data.logged && data.logged !== 'invalid') { CurrentWrapper = Wrapper }
//   else { CurrentWrapper = GuestWrapper }

//   switch (data.retrieve) {
//     case 'user_playlists':
//       SBFETCH.GetUserPlaylists(data, CurrentWrapper.giveMe.access_token())
//         .then(playlists => {
//           if (data.retrieve_user_data) {
//             GuestWrapper.setUserId(data.user_id)
//             CurrentWrapper.giveMe.user()
//               .then(user => {
//                 res.json({ playlists, user, request: data, status: 200 })
//               }, error => {
//                 console.log(error)
//                 res.json(error)
//               })
//           } else res.json({ playlists, request: data, status: 200 })
//         }
//         )

//       break

//     case 'playlist_tracks':
//       SBFETCH.GetPlaylistData(data.playlist_id, CurrentWrapper.giveMe.access_token())
//         .then(playlist => {
//           if (data.snapshot_id) {
//             if (data.snapshot_id === playlist.snapshot_id) {
//               console.log('SAME VERSION')
//               res.json({ playlist: { same_version: true }, request: data })
//               return
//             }
//           }
//           SBFETCH.GetPlaylistTracks(data.playlist_id, [], 0, CurrentWrapper.giveMe.access_token())
//             .then(tracks => {
//               console.log('Number of tracks Retireved: ', tracks.length)
//               playlist.tracks.items = tracks
//               res.json({ playlist, request: data })
//             })
//             .catch(error => {
//               console.log('Error when retrieving PL Tracks from GetPlaylistTracks: ', error)
//               playlist.tracks.items = null
//               res.json({ playlist, request: data })
//             })
//         })
//         .catch(error => {
//           console.log('Error when retrieving PL Data from GetPlaylistData: ', error)
//           res.status(error.status)
//           res.send(error)
//           // res.json({playlist: null, error, request: data})
//         })
//       break

//     //TODO
//     case 'user_profile':
//       // plMakeRequestTracks({ playlist_id: requestParams.playlist_id, token, callback: (playlist_id, tracks) => res.json({ playlist_id, tracks }) })
//       break
//   }
// }




