const TOKEN = global.CONSTANTS.TELEGRAM_BOT_TOKEN
const ENABLED = !!TOKEN
const USER_IDS = (global.CONSTANTS.TELEGRAM_USER_IDS || '').split(',').map(parseInt)
const ADMIN_ID = USER_IDS[0]

const DB = require('../DB/index')

const e = module.exports

const Slimbot = require('slimbot')
const slimbot = new Slimbot(TOKEN)

const auth = ({ from }) => USER_IDS.includes(from.id)

const ACTIONS = [
  {
    name: 'See Users',
    async cb () {
      const users = (await DB.LIST.users({ select: 'spotify_id' })).map(({ spotify_id }) => spotify_id)
      let str = `${users.join('\n')}\n\nTotal: ${users.length}`
      return str
    }
  }
]
ACTIONS.forEach(action => {
  action.slug = global.CASE.kebabCase(action.name)
})

const ACTIONS_LIST = ACTIONS.map(({ name }) => name).join('\n')

const ctr = {
  async onMessage (msg) {
    if (!auth(msg)) return ctr.replyDefault.rejection(msg)

    const action = ctr.defineAction(msg)
    if (!action) return ctr.replyDefault.unrecognizedAction(msg)

    const text = await action.cb()
    ctr.reply(text, msg)
  },
  reply (text, msg) {
    ctr.sendMessage(text, msg.chat.id)
  },
  send (text, chats) {
    if (!Array.isArray(chats)) chats = [chats]
    chats.forEach(id => ctr.sendMessage(text, id))
  },
  sendMessage (text, chat) {
    slimbot.sendMessage(chat, text, { parse_mode: 'MarkdownV2' })
  },
  defineAction ({ text }) {
    text = text.toLowerCase()
    return ACTIONS.find(action => action.name.toLowerCase() === text || action.slug === text)
  },
  replyDefault: {
    rejection (msg) {
      ctr.reply('I don\'t recognize you', msg)
    },
    unrecognizedAction (msg) {
      ctr.reply('I don\'t recognize that action\n\nTry any of these:\n' + ACTIONS_LIST, msg)
    }
  },
  // ------------------------------------------
  sendToAdmin (str) {
    ctr.send(str, ADMIN_ID)
  }
}

const notify = {
  userRegistered (user) {
    if (!ENABLED) return
    const str = `*${user.display_name}* has just registered!\n\n${(() => {
      const keys = [
        'display_name',
        'email',
        'country',
        'followers',
        'href',
        'id',
        'images',
        'external_urls',
      ]
      const fields = []
      keys.forEach(key => {
        let val = user[key]
        if (key === 'followers') val = val.total
        if (key === 'external_urls') val = val.spotify
        if (key === 'images') val = val[0]
        val && fields.push(key + ': ' + val)
      })
      return fields.join('\n')
    })()}`
    ctr.sendToAdmin(str)
  },
  userLogin (user) {
    if (!ENABLED) return
    const str = `*${user.display_name}* has logged in\n\n${(() => {
      const keys = [
        'display_name',
        'email',
        'country',
        'followers',
        'href',
        'id',
        'images',
        'external_urls',
      ]
      const fields = []
      keys.forEach(key => {
        let val = user[key]
        if (key === 'followers') val = val.total
        if (key === 'external_urls') val = val.spotify
        if (key === 'images') val = val[0]
        val && fields.push(key + ': ' + val)
      })
      return fields.join('\n')
    })()}`
    ctr.sendToAdmin(str)
  }
}

const debugBot = () => {
  const msg = ['*TEST*', '_TEST_', '~TEST~'].join('\n')
  console.log('Sending debug telegram bot text', msg)
  ctr.sendToAdmin(msg)
}


const init = () => {
  if (!ENABLED) return console.log('Telegram bot can\'t be initialized')
  slimbot.on('message', ctr.onMessage)
  slimbot.startPolling()
  if (global.CONSTANTS.ENV_DEV) debugBot()
}


e.init = init
e.notify = notify