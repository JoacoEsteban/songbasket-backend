const helpers = require('../../helpers')
const CREDS = helpers.CREDENTIALS.YOUTUBE

let Wrapper = new require('./youtube.wrapper').YouTubeAPI({
  access_tokens: CREDS.YOUTUBE_API_KEYS
})


const e = module.exports

e.youtubize = async (req, res) => {
  const track = req.body.track
  console.log(track)
  try {
    const conversion = await DB.getAllFrom(track.id)
    if (conversion !== false) {
      console.log('Track was found in DataBase')
      res.json(conversion)
      return
    }
    console.log('Track not cached, retrieving', track.id)
    try {
      conclusion = Wrapper.Youtubize(track) = require('./youtube.wrapper')
      res.json(conclusion)
      console.log('Track Retrieved', conclusion)
      DB.insertAllFrom(conclusion.id, conclusion.yt, conclusion.bestMatch)
    } catch (err) {
      console.error(err)
      res.status(500).send(err)
    }
  } catch (error) {
    console.error('ERROR WHEN CHECKING DB @index.js', error)
    res.status(500).send(error)
  }
}

e.videoDetails = async (req, res) => {
  const { ytId } = req.query
  console.log('getting youtube details from ', ytId)
  // TODO Forbid multiple matches with "$" at the end of regex
  let result = regexValidation.youtubeVideoId.exec(ytId)
  if (result === null) {
    let reason = 'Invalid YouTube Url or ID'
    console.error(reason)
    return res.status(400).json({
      error: true,
      reason
    })
  }
  let id = result[2]
  let conversion = await CUSTOM.getById(id)
  if (conversion === false) {
    console.log('Custom track details not cached')
    Wrapper.getDetails(id)
      .then(response => {
        console.log('details Retrieved', response)
        res.send(response)
        CUSTOM.addReg(response.id, response.snippet, response.duration)
      })
      .catch(err => {
        console.error(err)
        res.status(400)
        res.json({
          error: true,
          reason: err
        })
      })
  } else {
    console.log('details cached')
    res.send(conversion)
  }
}