const { Pool } = require('pg')
require('dotenv').config()

const isProduction = process.env.NODE_ENV === 'production'

let databaseName;

if(process.env.NODE_ENV === 'development') {
    databaseName = 'envelope2'
} else if(process.env.NODE_ENV === 'test'){
    databaseName = 'envelope2-test'
}


const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${databaseName}`

const pool = new Pool({
    connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
    ssl: {
        rejectUnauthorized: false
      }
  })

  module.exports = pool