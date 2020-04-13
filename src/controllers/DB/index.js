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
  // TODO Deprecate
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
  async getById(youtube_id) {
    try {
      const res = await YoutubeTracks.query({ where: { youtube_id } }).fetch()
      return {youtube_id: res.attributes.youtube_id, snippet: res.attributes.snippet, duration: res.attributes.duration}
    } catch (error) {
      if (error.message === 'EmptyResponse') return false
      throw error
    }
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
  addReg(spotify_id) {
    // TODO Fix duplicated yt registry cancelling this query
    return SpotifyTracks.forge({ spotify_id }).save()
  },
  async exists(spotify_id) {
    try {
      return !!(await this.getById(spotify_id))
    } catch (error) {
      throw error
    }
  }
}

const rel = {
  async getAllFrom(spotify_id) {
    try {
      const track = await sp.getById(spotify_id)
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
          if (!trackie) throw new Error('VIDEO ENTRY NOT FOUND IN DB')
        } catch (err) {
          console.error('ERRORRRR AT getById', id, err)
        }
        let {duration, snippet, youtube_id} = trackie
        conversion.push({id: youtube_id, duration, snippet})
        console.log('rem', remaining)
        if (!--remaining) return { id: spotify_id, yt: conversion }
      }
    } catch (error) {
      throw error
    }
  },
  addRelations(spotify_id, ids) {
    return new Promise(async (resolve, reject) => {
      if (!spotify_id || !ids || !ids.length) return reject(new Error('NO IDS PROVIDED'))
      if (!Array.isArray(ids)) ids = [ids]
      try {
        if (!await sp.exists(spotify_id)) await sp.addReg(spotify_id)
      } catch (error) {
        return reject(error)
      }

      let reqsLeft = ids.length
      let errors = []
      ids.forEach(id => {
        this.addReg(spotify_id, id)
        .catch(error => errors.push(error) && console.error('ERROR MAKING TRACK RELATION', error))
        .finally(() => !--reqsLeft && (errors.length ? reject : resolve)(errors.length && errors || null))
      })
    })
  },
  insertAllFrom(spotify_id, results) {
    // TODO Deprecate
    return new Promise(async (resolve, reject) => {
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
        !--ammount && resolve()
      })
    })
  },
  addReg(spotify_id, youtube_id) {
    return Relations.forge({ spotify_id, youtube_id }).save()
  }
}

module.exports = {
  DB: rel,
  YT: yt,
  AUTH: auth
}
