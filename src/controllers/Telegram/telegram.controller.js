const TOKEN = global.CONSTANTS.TELEGRAM_BOT_TOKEN
if (!TOKEN) return
const USER_IDS = (global.CONSTANTS.TELEGRAM_USER_IDS || '').split(',').map(parseInt)


const DB = require('../DB/index')

const e = module.exports

const Slimbot = require('slimbot');
const slimbot = new Slimbot(TOKEN);

const auth = ({from}) => USER_IDS.includes(from.id)

const ACTIONS = [
  {
    name: 'See Users',
    async cb () {
      const users = (await DB.LIST.users({select: 'spotify_id'})).map(({spotify_id}) => spotify_id)
      let str = `${users.join('\n')}\n\nTotal: ${users.length}`
      return str
    }
  }
]
ACTIONS.forEach(action => {
  action.slug = global.CASE.kebabCase(action.name)
})

console.log(ACTIONS)

const ACTIONS_LIST = ACTIONS.map(({name}) => name).join('\n')

const ctr = {
  async onMessage(msg) {
    console.log(ctr)
    if (!auth(msg)) return ctr.sendDefault.rejection(msg)

    const action = ctr.defineAction(msg)
    if (!action) return ctr.sendDefault.unrecognizedAction(msg)

    const text = await action.cb()
    ctr.send(text, msg)
  },
  send(text, msg) {
    slimbot.sendMessage(msg.chat.id, text);
  },
  defineAction({text}) {
    text = text.toLowerCase()
    return ACTIONS.find(action => action.name.toLowerCase() === text || action.slug === text)
  },
  sendDefault: {
    rejection(msg) {
      slimbot.sendMessage(msg.chat.id, 'I don\'t recognize you')
    },
    unrecognizedAction(msg) {
      slimbot.sendMessage(msg.chat.id, 'I don\'t recognize that action\n\nTry any of these:\n' + ACTIONS_LIST)
    }
  }
}


const init = () => {
  slimbot.on('message', ctr.onMessage);
  slimbot.startPolling();
}


e.init = init
e.controller = ctr