# Pulsion Protocol

## Connection Flow

Client 				              Chat Server  		       Auth Server
------				              -----------		         -----------

	  ==============URL===========>

				                    TLS handshake

 	  <===========JS App===========

initialize app, login

	  ====================username/password==============>

							                                     generate JWT from credentials

 	  <==========================JWT======================

store token

	  ==========ws:connect=========>

				                    assign socket id
                            move session to segregated "auth" channel
                            store user id in session

	  <==ws:connected (socketid)====

store socket id

	  ===ws:authenticate (JWT)=====>

				                    verify JWT; if authentic...
                            destroy any pre-existing sessions for user id
                            move session to "lobby" channel

	  <======ws:authenticated=======
	  <======ws:channel:join========

listen for notifications
join channel "lobby", list users

	  ==========ws:message=========>

				                    broadcast message to channel

	  <=========ws:message==========

display new message
