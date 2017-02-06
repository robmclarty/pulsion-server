'use strict'

const express = require('express')
const WebSocketServer = require('ws').Server
const url = require('url')

const app = express()

const server = app.listen(3000, () => {
  console.log('Server started on port 3000')
})

const wss = new WebSocketServer({
  server: server,
  path: '/ws'
})

wss.on('connection', ws => {
  console.log('client connected')

  const location = url.parse(ws.upgradeReq.url, true)

  ws.on('message', msg => {
    console.log(`received: ${ msg }`)
  })
})
