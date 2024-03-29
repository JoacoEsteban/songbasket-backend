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
    key: Wrapper.creds.access_token,
    ...params
  }
}

const API = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3/',
  timeout: 2000
})

const e = module.exports

e.checkQuota = async (req, res, next) => {
  // TODO Implement user requests limit
  req.hasQuota = !!Wrapper.creds.access_token
  next()
}

e.quotaReject = res => handlers.status.c503(res)

e.youtubize = async (req, res) => {
  try {
    let track = req.body.track
    console.log(track)
    if (!track) return handlers.status.c400(res, 'No track provided')
    if (typeof track === 'string') track = JSON.parse(track)
    if (!(track && track.query)) return handlers.status.c400(res)
    if (!helpers.REGEX.spotifyTrackId(track.id)) return handlers.status.c400(res)
    // ------------------
    const localConversion = await DB.getAllFrom(track.id)
    // TODO Implement track cache invalidation and check
    if (localConversion !== false && localConversion.yt.length) {
      console.log('Track was found in DataBase')
      return res.json(localConversion)
    }
    // ------------------
    if (!req.hasQuota) return e.quotaReject(res)

    console.log('Track not cached, retrieving', track.id)
    const conversion = await Youtubize(track, req)
    res.json({ id: track.id, yt: conversion })
    try {
      if (conversion.length) await DB.addRelations(track.id, conversion.map(c => c.youtube_id))
    } catch (error) {
      // console.error(error)
    }
  } catch (error) {
    console.error('ERROR WHEN YOUTUBIZING @index.js', error)
    handlers.status.c500(res, error)
  }
}

e.routeVideoDetails = async (req, res) => {
  try {
    const details = await e.videoDetails(req.params.ids, req)
    return res.json(details.length === 1 ? details[0] : details)
  } catch (error) {
    handlers.status.c500(res, error)
  }
}

e.videoDetails = async (ids, req) => {
  if (!ids) throw new Error('ID MISSING')
  if (!Array.isArray(ids)) ids = ids.split(',')
  // ------------ CHECK DB ------------
  let reqsLeft = ids.length
  try {
    const errors = []
    await Promise.allSettled(ids.map(async (id, index) => {
      const regexResult = helpers.REGEX.youtubeVideoUrl.exec(id)
      if (!regexResult) {
        ids[index] = {
          id,
          error: 'invalid ID'
        }
        return
      }
      if (regexResult) id = regexResult.last

      try {
        const conversion = (await YT.getById(id))
        if (conversion) ids[index] = conversion
      } catch (error) {
        errors.push(error)
      }
    }))
    if (errors.length) throw errors
  } catch (error) {
    console.error('ERROR WHEN ACCESSING DB', error)
    if (global.CONSTANTS.ENV_DEV) throw error
  }
  // ------------ END CHECK DB ------------

  // ------------ RETRIEVE LEFTOVER TRACKS ------------
  try {
    const toRetrieve = ids.filter(id => typeof id === 'string')
    let retrievedTracks = []
    if (toRetrieve.length && req.hasQuota) {
      retrievedTracks = await getVideoDetails(toRetrieve)
      try {
        await Promise.allSettled(retrievedTracks.map(async track => YT.addReg(track.youtube_id, track.snippet, track.duration, req.user.spotify_id)))
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

const errorIsQuotaLimit = (error, token) => {
  console.error(error.code, error.toJSON())
  const code = error && error.response && error.response.status
  if (code === 403) {
    if (Wrapper.onExpiredAccessToken(token)) return true
    else throw new Error('QUOTA EXCEEDED; NO ACCESS TOKENS LEFT')
  }
}

const Youtubize = async (track, req) => {
  try {
    const ids = await runSearch(track)
    if (!ids.length) return []
    const videos = await e.videoDetails(ids, req)

    return videos
  } catch (error) {
    throw error
  }
}

const runSearch = async ({ query, duration }) => {
  const url = '/search'
  const params = makeParams((() => {
    const params = {
      ...helpers.YOUTUBE_API_OPTIONS.searchParams,
      q: handlers.encodeQuery(query),
    }
    duration && (params.videoDuration = duration)
    return params
  })())

  try {
    const response = await API.get(url, { params })
    return response && response.data.items.map(i => i.id.videoId)
  } catch (error) {
    try {
      if (!errorIsQuotaLimit(error, params.key)) throw error
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
  const params = makeParams({
    ...helpers.YOUTUBE_API_OPTIONS.videoDetailsParams,
    id: ids.join(',')
  })

  try {
    const response = await API.get(url, { params })
    return response && response.data.items.map(({ snippet, contentDetails, id }) => ({ snippet, youtube_id: id, duration: parseDuration(contentDetails.duration) }))
  } catch (error) {
    try {
      if (!errorIsQuotaLimit(error, params.key)) throw error
      else return await getVideoDetails({
        ids
      }) // token cycled, try again
    } catch (error) {
      throw (error)
    }
  }
}

const parseDuration = (() => {
  const regex = /P(?:(\d*)Y)?(?:(\d*)M)?(?:(\d*)W)?(?:(\d*)D)?T(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/i
  const parts = [{ // years
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
  }]

  return PT => {
    let durationInSec = 0
    const matches = PT.match(regex)

    for (var i = 0; i < parts.length; i++) {
      if (typeof matches[parts[i].pos] != 'undefined') {
        durationInSec += parseInt(matches[parts[i].pos]) * parts[i].multiplier
      }
    }

    return durationInSec
  }
})()