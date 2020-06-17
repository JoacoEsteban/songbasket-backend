const axios = require('axios')
const request = require('request')

const {getDate} = require('../../helpers/handlers')

module.exports = {
  YouTubeAPI: function ({ access_tokens }) {
    const env = this
    this.access_tokens = {
      list: access_tokens.map(token => {
        return {
          token,
          uses: 0,
          availableAt: new Date()
        }
      }),
      index: 0,
      get current () {
        return this.index + 1 && this.list[this.index]
      }
    }

    // Sets token from array of tokens. Just pass the index
    this.setCurrentAccessToken = index => {
      if (index === -1 || !this.access_tokens.list[index]) throw new Error('INVALID INDEX SETTING ACCESS TOKEN')
      this.access_tokens.index = index
    }
    // Checks the next token exists and sets it
    const getNextTokenIndex = () => {
      const now = new Date()
      let index = this.access_tokens.list.indexOfSearch(tok => tok.availableAt < now)
      return index
    }

    this.cycleAccessToken = () => {
      const index = getNextTokenIndex()
      if (index === -1) return false
      this.setCurrentAccessToken(index)
      return true
    }

    this.onExpiredAccessToken = token => {
      console.log('\n-----------ACCESS TOKEN EXPIRED-----------\n')
      token = this.access_tokens.list.find(t => t.token === token)
      if (!token) throw new Error('EXPIRED TOKEN NOT FOUND')

      const date = new Date()
      date.setDate(date.getDate() + 1)
      
      token.availableAt = date
      
      this.access_tokens.index = null
      return this.cycleAccessToken()
    }

    this.creds = {
      get access_token () {
        if (!env.access_tokens.current) env.cycleAccessToken()
        return env.access_tokens.current && env.access_tokens.current.token
      }
    }

    return this
  }
}