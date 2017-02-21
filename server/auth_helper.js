'use strict'

const jwt = require('jsonwebtoken')
const cred = require('./cred')

const verifyToken = token => new Promise((resolve, reject) => {
  if (!token) {
    console.log('No token provided with socket connectsion.')
    return reject(new Error('No token provided.'))
  }

  const options = {
    issuer: cred.issuer,
    algorithms: [cred.accessOpts.algorithm]
  }

  jwt.verify(token, cred.accessOpts.publicKey, options, (err, payload) => {
    if (err) {
      console.log('Unauthorized socket connection.')
      return reject(new Error('Unauthorized socket connection.'))
    }

    resolve(payload)
  })
})

module.exports = {
  verifyToken
}
