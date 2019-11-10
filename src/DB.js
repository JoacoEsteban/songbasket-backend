// Setting up the database connection
const knex = require('knex')({
  client: 'postgres',
  connection: {
    host: process.env.DATABASE_URL,
    user: 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: 'songbasket_db',
    charset: 'utf8'
  }
})
const db = require('bookshelf')(knex)

// Defining models
const YoutubeTracks = db.model('YoutubeTracks', {
  tableName: 'youtube_tracks'
})
const SpotifyTracks = db.model('SpotifyTracks', {
  tableName: 'spotify_tracks'
})
const Relations = db.model('Relations', {
  tableName: 'conversion_relations'
})

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
          if (err.message === 'EmptyResponse') resolve(false)
          reject(err)
        })
    })
  },
  addReg(spotify_id, bestMatch) {
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
    console.log('IDS', ids)
    let remaining = ids.length
    for (let i in ids) {
      let id = ids[i]
      console.log('gettin', id)
      let trackie = await yt.getById(id)
      let {duration, snippet, youtube_id} = trackie.attributes
      conversion.push({id: youtube_id, duration, snippet})
      if (--remaining === 0) return { id: spotify_id, bestMatch: track.best_match, yt: conversion }
    }
    
  },
  addReg(spotify_id, youtube_id) {
    return Relations.forge({ spotify_id, youtube_id }).save()
  },
  insertAllFrom(spotify_id, results, bestMatch) {
    return new Promise(async (resolve, reject) => {
      let bmatch = results.find(res => res.id === bestMatch)
      await yt.addReg(bmatch.id, bmatch.snippet, bmatch.duration)
      await sp.addReg(spotify_id, bestMatch)
      await this.addReg(spotify_id, bestMatch)
      // This three ops are executed first before bestMatch acts as a foreign key to spotify_tracks table
      // So the entry must exist in the youtube_tracks table before creating the other rows
      results = results.filter(res => res.id !== bestMatch)

      let ammount = results.length
      results.forEach(({ id, snippet, duration }) => {
        yt.addReg(id, snippet, duration)
          .then(() => {
            this.addReg(spotify_id, id)
              .then(() => {
                if (--ammount === 0) resolve()
              })
              .catch(err => reject(err))
          })
          .catch(err => reject(err))
      })
    })
  }
}

module.exports = {
  DB: rel
}


// yt.getById('2LClTly6E2s')
//   .then(res => {
//     console.log(res.attributes)
//   })
