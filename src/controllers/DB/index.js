const uuid = require('uuid').v4

const config = process.env.PRODUCTION ? {
  client: 'postgres',
  connection: {
    host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
    user: 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: 'songbasket_db',
    charset: 'utf8'
  }
} : require('../../config/core.config').DB

const knex = require('knex')(config)
knex.client.pool.createRetryIntervalMillis = 500

const db = require('bookshelf')(knex)
// Defining models
const Users = db.model('Users', {
  tableName: 'users'
})
const YoutubeCustomTracks = db.model('YoutubeCustomTracks', {
  tableName: 'youtube_custom_tracks'
})
const YoutubeTracks = db.model('YoutubeTracks', {
  tableName: 'youtube_tracks'
})
const SpotifyTracks = db.model('SpotifyTracks', {
  tableName: 'spotify_tracks'
})
const Relations = db.model('Relations', {
  tableName: 'conversion_relations'
})

const auth = {
  async authenticate(user_id, songbasket_id) {
    try {
      const user = await this.getUserBySongbasketId(songbasket_id)
      return user.attributes && user.attributes.spotify_id === user_id && user.attributes
    } catch (err) {
      if (err.message === 'EmptyResponse') return false
      throw err
    }
  },
  getUserBySpotifyId(spotify_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const model = await Users.query({ where: { spotify_id } }).fetch()
        resolve(model)
      } catch (err) {
        if (err.message === 'EmptyResponse') return resolve(false)
        reject(err)
      }
    })
  },
  getUserBySongbasketId(songbasket_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const model = await Users.query({ where: { songbasket_id } }).fetch()
        resolve(model)
      } catch (err) {
        if (err.message === 'EmptyResponse') return resolve(false)
        reject(err)
      }
    })
  },
  updateUserAccessTokenBySongbasketId({songbasket_id, access_token, token_expires_at}) {
    return new Promise(async (resolve, reject) => {
      try {
          await Users.where({songbasket_id}).save({access_token, token_expires_at}, {patch: true})
          resolve()
      } catch (err) {
        reject(err)
      }
    })
  },
  createUser({ spotify_id, access_token, refresh_token, token_expires_at }) {
    if (!spotify_id) throw new Error('SPOFITY ID MISSING WHEN CREATING USER')

    return new Promise(async (resolve, reject) => {
      try {
        const user = await this.getUserBySpotifyId(spotify_id)
        if (user && user.attributes) {
          console.log('USER EXISTS')
          await Users.where({spotify_id}).save({access_token, refresh_token, token_expires_at}, {patch: true})
          return resolve(user.attributes.songbasket_id)
        }

        const songbasket_id = (uuid()).replace(/\-/g, '')
        await Users.forge({songbasket_id, spotify_id, access_token, refresh_token, token_expires_at}).save()
        resolve(songbasket_id)
      } catch (error) {
        reject(error)
      }
    })
  }
}

const custom = {
  getById(youtube_id) {
    return new Promise((resolve, reject) => {
      YoutubeCustomTracks.query({ where: { youtube_id } })
        .fetch()
        .then(res => {
          let {duration, snippet, youtube_id} = res.attributes
          resolve({id: youtube_id, duration, snippet})
        })
        .catch(err => {
          if (err.message === 'EmptyResponse') return resolve(false)
          reject(err)
        })
    })
  },
  addReg(youtube_id, snippet, duration) {
    return YoutubeCustomTracks.forge({ youtube_id, snippet: JSON.stringify(snippet), duration }).save()
  }
}

const yt = {
  getById(youtube_id) {
    return YoutubeTracks.query({ where: { youtube_id } }).fetch()
  },
  addReg(youtube_id, snippet, duration) {
    return YoutubeTracks.forge({ youtube_id, snippet: JSON.stringify(snippet), duration }).save()
  }
}

const sp = {
  getById(spotify_id) {
    return new Promise((resolve, reject) => {
      SpotifyTracks.query({ where: { spotify_id } })
        .fetch()
        .then(res => resolve(res.attributes))
        .catch(err => {
          if (err.message === 'EmptyResponse') return resolve(false)
          reject(err)
        })
    })
  },
  addReg(spotify_id, bestMatch) {
    // TODO Fix duplicated yt registry cancelling this query
    return SpotifyTracks.forge({ spotify_id, best_match: bestMatch }).save()
  }
}

const rel = {
  async getAllFrom(spotify_id) {
    let track = await sp.getById(spotify_id)
    if (!track) {
      // Track not found
      return false
    }
    console.log('FOUND', track)
    let conversion = []
    let ids = await Relations.query({ select: 'youtube_id', where: { spotify_id } }).fetchAll()
    ids = ids.models.map(r => r.attributes.youtube_id)
    let remaining = ids.length
    for (let i in ids) {
      let id = ids[i]
      // console.log('gettin', id)
      let trackie
      try {
        trackie = await yt.getById(id)
      } catch (err) {
        console.error('ERRORRRR AT getById line 95', id, err)
      }
      let {duration, snippet, youtube_id} = trackie.attributes
      conversion.push({id: youtube_id, duration, snippet})
      console.log('rem', remaining)
      if (--remaining === 0) return { id: spotify_id, bestMatch: track.best_match, yt: conversion }
    }
    
  },
  insertAllFrom(spotify_id, results, bestMatch) {
    return new Promise(async (resolve, reject) => {
      let bmatch = results.find(res => res.id === bestMatch)
      try {
        await yt.addReg(bmatch.id, bmatch.snippet, bmatch.duration)
      } catch (err) {
        console.error('ERR WHILE ADDING BMATCH TO YT', bmatch.id, err)
      }
      try {
        await sp.addReg(spotify_id, bmatch.id)
      } catch (err) {
        console.error('ERR WHILE ADDING BMATCH TO SP', spotify_id, bmatch.id, err)
      }
      try {
        await this.addReg(spotify_id, bmatch.id)
      } catch (err) {
        console.error('ERR WHILE ADDING BMATCH TO REL', spotify_id, bmatch.id, err)
      }
      // This three ops are executed first before bestMatch acts as a foreign key to spotify_tracks table
      // So the entry must exist in the youtube_tracks table before creating the other rows
      results = results.filter(res => res.id !== bmatch.id)

      let ammount = results.length
      results.forEach(async ({ id, snippet, duration }) => {
        try {
          await yt.addReg(id, snippet, duration)
        } catch (err) {
          console.error('ERR WHEN ADDING TO YT', err)
        }
        
        try {
          await this.addReg(spotify_id, id)
        } catch (err) {
          console.error('ERR WHEN ADDING TO REL', spotify_id, id, err)
        }
        if (--ammount === 0) resolve()
      })
    })
  },
  addReg(spotify_id, youtube_id) {
    return Relations.forge({ spotify_id, youtube_id }).save()
  }
}

module.exports = {
  DB: rel,
  CUSTOM: custom,
  AUTH: auth
}
