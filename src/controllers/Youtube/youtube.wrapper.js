const axios = require('axios')
const request = require('request')

const {getDate} = require('../../helpers/handlers')

module.exports = {
  YouTubeAPI: function ({ access_tokens }) {
    this.access_tokens = access_tokens.map(token => {
      return {
        token,
        uses: 0,
        lastUsed: null,
        cooldown: null
      }
    })
    this.current_access_token = {
      token: this.access_tokens[0].token,
      index: 0
    }

    // Sets token from array of tokens. Just pass the index
    this.setCurrentAccessToken = (index) => {
      this.current_access_token = {
        token: this.access_tokens[index].token,
        index
      }
      console.log('ACCESS TOKEN SET::: ' + this.current_access_token.token)
    }
    // Checks the next token exists and sets it
    this.cycleAccessToken = () => {
      let index = this.current_access_token.index + 1
      if (this.access_tokens[index]) {
        console.log('CYCLING ACCESS TOKEN: + 1::')
        this.setCurrentAccessToken(index)
      } else {
        console.log('CYCLING ACCESS TOKEN: Coming back to first access_token::')
        this.setCurrentAccessToken(0)
      }
      // TODO manage unusable tokens
      return true
    }

    this.giveMe = {
      current_access_token: () => this.current_access_token.token,
    }

    return this
  }
}