'use strict'

module.exports = {
  appName: process.env.APP_NAME || 'pulsion',
  issuer: process.env.JWT_ISSUER || 'cred-auth-manager',
  origin: process.env.ORIGIN || '*',
  publicKeyPath: process.env.ACCESS_PUBLIC_KEY || './config/public-key.pem.sample',
  algorithm: process.env.ACCESS_ALG || 'ES384' // ECDSA using P-384 curve and SHA-384 hash algorithm
}
