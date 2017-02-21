'use strict'

const express = require('express')
const WebSocketServer = require('ws').Server
const url = require('url')
const jwt = require('jsonwebtoken')
const shortid = require('shortid')
const { verifyToken } = require('./auth_helper')

const app = express()

const server = app.listen(3001, () => {
  console.log('Server started on port 3001')
})


// Websockets/Chat
// ===============

const DEFAULT_CHANNEL = 'lobby'
const AUTH_CHANNEL = 'auth'

// This object is intended to contain members whose names are channels which
// themselves are arrays of sockets which are connected to those channels.
const channels = {
  [DEFAULT_CHANNEL]: [],
  [AUTH_CHANNEL]: []
}

// - 1 session per logged-in user
// - each user maintains a list of channels created by themselves to which
// other users may be invited
// - after logging in, remove any existing sessions with the same userId (e.g.,
// logout of other devices that were left open)
// - timeout session after predefined idle time and perhaps move to special
// "afk" area

// const sessions = [
//   {
//     socketId,
//     userId,
//     socket,
//     status,
//     channels: [
//       {
//         channelId,
//         name,
//         sockets: [ socketId ]
//       }
//     ]
//   }
// ]


// groups         channels                messages
// ======         ========                ========
// friends        text, voice, direct     ...


// - all group management operations should happen through the JSON API
// (e.g., adding, removing, joining, etc. are done through AJAX)
// -
// - an update to a group must also include an update to any active groups
// which exist in the websocket system
//
// groups (database) = [
//   {
//     groupId,
//     name,
//     members: [ userId ]
//   }
// ]
//
// friends = [
// ]
//
// friend_requests = [
// ]
//
// channels = [
//   {
//     channelId,
//     groupId,
//     name,
//     members: [ userId ]
//   }
// ]

// group hasAndBelongsToMany users
// group hasMany channels
// channel belongsTo group
// channel hasMany users
// channel hasMany messages
// message belongsTo channel
// message belongsTo user

// MVP
// ===
// - 1 "public" channel
// - channel has hard-wired settings (can't edit)
// - direct messages
// - no persistance
// - e2e encryption (curve25519 DHKE + AES256 + SHA256 HMAC)
// - no forward secrecy

// Alpha
// =====
// - groups
// - multiple channels per group (each channel with its own members)
// - channels can be either "public" or "private" meaning either all members
// of a group can join, or only invited members of a group may join
// - include easy-to-use input for finding members to invite using fuzzy search
// of input text (e.g., match against username, email, show thumbnails, etc.)
// - persistance of messages (e.g., logging out and back in will retrieve past
// messages
// - only a channel/group's owner can make changes

// Beta
// ====
// - users may be given priviledges by a channel's/group's creator to enable
// them to edit the channel/group
// - don't load all messages from the beginning of time; only load the latest
// ones and load older ones as needed (e.g., scrolling up, searching, etc.)
// - include command parsing of inputs to display emojis and execute special
// commands (e.g., `/quit` to logout, `/2` to switch to group 2, `:-)` to
// display smiley face emjoi, etc.)


const wss = new WebSocketServer({
  server,
  path: '/chat'
  // verifyClient: (info, next) => {
  //   const token = info.req.headers.token
  //
  //   console.log('authorizing...', info)
  //
  //   next(true)
  //
  //   // verifyToken(token)
  //   //   .then(payload => {
  //   //     info.req.cred = payload
  //   //     next(true)
  //   //   })
  //   //   .catch(err => next(false, 401, `Unauthorized: ${ err }`))
  // }
})


// Send a message to a specific socket created by ws.
const emit = (socket, msg) => {
  try {
    socket.send(JSON.stringify(msg))
  } catch (e) {
    console.log('Could not send message.', e)
    socket.close()
  }
}

// Assumes sockets is an array of "sockets" (as defined below) that each have
// a "ws" member which is the ws websocket object that has the `send` function.
const broadcast = (users, msg, blacklist) => {
  users.forEach(user => {
    if (!blacklist.includes(user.username)) emit(user.socket, msg)
  })
}

const createChannelUser = (socket, username, status = 'unauthorized') => ({
  id: shortid.generate(),
  username,
  socket,
  status
})

// Remove any existing references to this user in this channel.
const removeUserFromChannel = (channel, user) => {
  channels[channel] = channels[channel].filter(channelUser => {
    return channelUser.username != user.username
  })
}

// TODO: channels is being referenced as a side-effect. purify this.
const addUserToChannel = (channel, user) => {
  removeUserFromChannel(channel, user)

  // Add new reference for this user to channel.
  channels[channel].push(user)
}


const handleMessage = socket => data => {
  const msg = JSON.parse(data)

  console.log(`received: `, msg)

  switch (msg.type) {
  case 'connect':
    const user = createChannelUser(socket, msg.username)

    addUserToChannel(AUTH_CHANNEL, user)

    emit(socket, {
      type: 'connected',
      socketId: user.id
    })

    break
  case 'authenticate':
    verifyToken(msg.token)
      .catch(err => {
        emit(socket, {
          type: 'unauthorized',
          error: err
        })
        socket.close()
      })
      .then(payload => {
        const user = createChannelUser(socket, payload.username, 'authorized')

        // Let the client know that they are now authenticated.
        emit(socket, {
          type: 'authenticated',
          username: payload.username
        })

        // Move user from auth channel to default channel.
        removeUserFromChannel(AUTH_CHANNEL, user)
        addUserToChannel(DEFAULT_CHANNEL, user)

        // Let everyone in the default channel know a new user has joined.
        broadcast(channels[DEFAULT_CHANNEL], {
          type: 'channel:join',
          username: payload.username
        }, [payload.username])
      })

      break
  default:
    // do nothing
  }

  console.log('channels: ', channels)
}

wss.on('connection', ws => {
  console.log('client connected')

  //const location = url.parse(ws.upgradeReq.url, true) // do we need this?
  //const cred = ws.upgradeReq.cred

  // console.log(`channel "${ DEFAULT_CHANNEL }"`)
  // channels[DEFAULT_CHANNEL].forEach(user => {
  //   console.log(user.username)
  // })

  // TODO: try doing this without directly requiring jsonwebtoken.
  //const payload = jwt.decode(token)

  // Send connection response.
  // emit(ws, {
  //   type: 'connected',
  //   socketId: socket.id
  // })

  // Tell everyone in the default channel that a new user has joined.
  // broadcast(channels[DEFAULT_CHANNEL], {
  //   type: 'channel:join',
  //   username: user.username
  // }, ['12345'])

  // Relay a message.
  ws.on('message', handleMessage(ws))

  // str => {
  //   const msg = JSON.parse(str)
  //   console.log(`received: `, msg)
  // })

  // Authenticate a connecting client.
  // ws.on('authenticate', data => {
  //   verifyToken(data.token)
  //     .catch(err => ws.send('unauthorized', err, ws.close))
  //     .then(token => {
  //       ws.send('authenticated', token)
  //
  //
  //     })
  // })
})
