const axios = require('axios')

const helpers = require('../../helpers')
const handlers = require('../../helpers/handlers')
const {
  DB,
  YT
} = require('../DB')
const CREDS = helpers.CREDENTIALS.YOUTUBE

const Wrapper = new require('./youtube.wrapper').YouTubeAPI({
  access_tokens: CREDS.YOUTUBE_API_KEYS
})

const makeParams = (params) => {
  return {
    key: Wrapper.giveMe.current_access_token(),
    ...params
  }
}

const API = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3/',
  timeout: 2000
})

const e = module.exports

e.youtubize = async (req, res) => {
  try {
    let track = req.body.track
    console.log(track)
    if (!track) return handlers.status.c400(res, 'No track provided')
    if (typeof track === 'string') track = JSON.parse(track)
    if (!(track && track.query)) return handlers.status.c400(res, 'dou1')
    if (!helpers.REGEX.spotifyTrackId(track.id)) return handlers.status.c400(res, 'dou2')
    // ------------------
    const localConversion = await DB.getAllFrom(track.id)
    if (localConversion !== false) {
      // TODO check if track needs cache invalidation
      console.log('Track was found in DataBase')
      return res.json(localConversion)
    }
    // ------------------
    console.log('Track not cached, retrieving', track.id)
    const conversion = await Youtubize(track)
    res.json({id: track.id, yt: conversion})
    try {
      await DB.addRelations(track.id, conversion.map(c => c.youtube_id))
    } catch (error) {
      console.error(error)
    }
  } catch (error) {
    console.error('ERROR WHEN YOUTUBIZING DB @index.js', error)
    handlers.status.c500(res, error)
  }
}

e.routeVideoDetails = async (req, res) => {
  // TODO
  try {
    const details = await e.videoDetails(req.params.ids)
    return res.json(details.length === 1 ? details[0] : details)
  } catch (error) {
    handlers.status.c500(res, error)
  }
}

e.videoDetails = async ids => {
  // TODO Forbid multiple matches with "$" at the end of regex
  if (!ids) throw new Error('ID MISSING')
  if (!Array.isArray(ids)) ids = ids.split(',')
  // ------------ CHECK DB ------------
  let reqsLeft = ids.length
  try {
    await (() => new Promise((resolve, reject) => {
      const errors = []
      ids.forEach(async (id, index) => {
        const idFormatted = helpers.REGEX.youtubeVideoUrl.exec(id)
        if (!idFormatted && !helpers.REGEX.youtubeVideoId.test(id)) return ids[index] = {
          id,
          error: 'invalid ID'
        }
        if (idFormatted) id = idFormatted[1]

        YT.getById(id)
          .then(cachedConversion => {
            if (cachedConversion) ids[index] = cachedConversion
          })
          .catch(error => {
            errors.push(error)
          })
          .finally(() => !--reqsLeft && (errors.length ? reject(errors) : resolve()))
      })
    }))()
  } catch (error) {
    console.error('ERROR WHEN ACCESSING DB', error)
    if (global.IS_DEV) throw error
  }
  // ------------ END CHECK DB ------------

  // ------------ RETRIEVE LEFTOVER TRACKS ------------
  try {
    const toRetrieve = ids.filter(id => typeof id === 'string')
    let retrievedTracks = []
    if (toRetrieve.length) {
      retrievedTracks = await getVideoDetails(toRetrieve)
      try {
        await retrievedTracks.forEach(async track => YT.addReg(track.youtube_id, track.snippet, track.duration))
      } catch (error) {
        console.error('ERROR WHEN ADDING TRACK TO TO DB', error)
      }
    }
    return [...ids.filter(conversion => typeof conversion === 'object'), ...retrievedTracks]
  } catch (error) {
    throw error
  }
  // ------------ END RETRIEVE ------------
}

const defineError = error => {
  console.error(error)
  if (error.code === 403) {
    if (Wrapper.cycleAccessToken()) return true
    else throw new Error('QUOTA EXCEEDED; NO ACCESS TOKENS LEFT')
  }
}

const Youtubize = async track => {
  try {
    const ids = await runSearch(track)
    const videos = await e.videoDetails(ids)

    return videos
  } catch (error) {
    throw error
  }
}

const runSearch = async ({
  query,
  duration
}) => {
  const url = '/search'
  try {
    const response = await API.get(url, {
      params: makeParams((() => {
        const params = {
          ...helpers.YOUTUBE_API_OPTIONS.searchParams,
          q: handlers.encodeQuery(query),
        }
        duration && (params.videoDuration = duration)
        return params
      })())
    })
    return response && response.data.items.map(i => i.id.videoId)
  } catch (error) {
    try {
      if (!defineError(error)) throw error
      else return await runSearch({
        query,
        duration
      }) // token cycled, try again
    } catch (error) {
      throw (error)
    }
  }
}

const getVideoDetails = async ids => {
  const url = '/videos'
  try {
    const response = await API.get(url, {
      params: makeParams({
        ...helpers.YOUTUBE_API_OPTIONS.videoDetailsParams,
        id: ids.join(',')
      })
    })
    return response && response.data.items.map(({snippet, contentDetails, id}) => ({snippet, youtube_id: id, duration: parseDuration(contentDetails.duration)}))
  } catch (error) {
    try {
      if (!defineError(error)) throw error
      else return await getVideoDetails({
        ids
      }) // token cycled, try again
    } catch (error) {
      throw (error)
    }
  }
}

const parseDuration = (PT) => {
  var durationInSec = 0
  var matches = PT.match(/P(?:(\d*)Y)?(?:(\d*)M)?(?:(\d*)W)?(?:(\d*)D)?T(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/i)
  var parts = [{ // years
      pos: 1,
      multiplier: 86400 * 365
    },
    { // months
      pos: 2,
      multiplier: 86400 * 30
    },
    { // weeks
      pos: 3,
      multiplier: 604800
    },
    { // days
      pos: 4,
      multiplier: 86400
    },
    { // hours
      pos: 5,
      multiplier: 3600
    },
    { // minutes
      pos: 6,
      multiplier: 60
    },
    { // seconds
      pos: 7,
      multiplier: 1
    }
  ]

  for (var i = 0; i < parts.length; i++) {
    if (typeof matches[parts[i].pos] != 'undefined') {
      durationInSec += parseInt(matches[parts[i].pos]) * parts[i].multiplier
    }
  }

  return durationInSec
}