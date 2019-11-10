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
        .then(res => resolve(res))
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
    let trackExists = await sp.getById(spotify_id)
    if (!trackExists) {
      // Track not found
      return false
    }
    return Relations.query({ where: { spotify_id } })
    // TODO fetch from Tracks table
  },
  addReg(spotify_id, youtube_id) {
    return Relations.forge({ spotify_id, youtube_id }).save()
  },
  insertAllFrom(spotify_id, results, bestMatch) {
    let ammount = results.length
    return new Promise((resolve, reject) => {
      results.forEach(({ id, snippet, duration }) => {
        yt.addReg(id, snippet, duration)
          .then(() => {
            if (id === bestMatch) {
              sp.addReg(spotify_id, bestMatch)
                .then(() => {
                  this.addReg(spotify_id, id)
                    .then(() => {
                      if (--ammount === 0) resolve()
                    })
                    .catch(err => reject(err))
                })
            } else {
              this.addReg(spotify_id, id)
                .then(() => {
                  if (--ammount === 0) resolve()
                })
                .catch(err => reject(err))
            }
          })
          .catch(err => reject(err))
      })
    })
  }
}

module.exports = {
  DB: rel
}