const DB = require('../controllers/DB')
const e = module.exports

const reject = (res, message = 'Unauthorized') => {
  res.status(401).send(message)
  return false
}
e.checkAuth = async (req, res, next) => {
  const token = req.get('Authorization')
  const user_id = req.get('user_id')
  if (!token) return reject(res)
  if (!user_id) return reject(res)
  if (token.length !== 39 || !(token.indexOf('Bearer ') + 1)) return reject(res)

  try {
// --------------BETA-AUTH--------------
  if (!await DB.AUTH.authBetaUser(user_id)) return reject(res, 'Not a beta participant')
// --------------BETA-AUTH--------------
    const user = await DB.AUTH.authenticate(user_id, token.replace('Bearer ', ''))
    if (!user) return reject(res)
    req.user = user
    next()
  } catch(error) {
    console.error(error)
    e.status.c500(res)
  }
}

const makeStatus = (status, message) => (res, m) => res.status(status).send(m || message || '')
e.status = {
  makeStatus,
  c200: makeStatus(200),
  c500: makeStatus(500, 'Internal Server Error'),
  c400: makeStatus(400, 'Bad Request')
}

e.getDate = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));

e.encodeQuery = q => encodeURIComponent(q).replace(/\%20/g, '+')