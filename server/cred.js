'use strict'

const { readFileSync } = require('fs')
const gotCred = require('cred')
const config = require('../config/server')

const cred = gotCred({
  resource: config.appName,
  issuer: config.issuer,
  accessOpts: {
    publicKey: readFileSync(config.publicKeyPath),
    algorithm: config.algorithm
  }
}, true)

module.exports = cred
