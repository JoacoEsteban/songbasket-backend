const e = module.exports

e.DB = {
  client: 'postgres',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    // password: '',
    database: 'songbasket_db',
    charset: 'utf8'
  }
}