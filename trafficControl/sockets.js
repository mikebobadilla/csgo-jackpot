var kue = require('kue');
var queue = kue.createQueue();

var PORT = 8000
var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)
server.listen(PORT)


var Sequelize = require('sequelize');
var sequelize = new Sequelize('csgoparlor', 'root', 'snapple1');

var users = sequelize.define('users', {
  steamid: {
    type: Sequelize.STRING,
    unique: true
  },
  displayname: Sequelize.STRING,
  tradeurl: Sequelize.STRING,
  photo: Sequelize.STRING
});

sequelize.sync()

//
//
// MINI POT DETAILS
//
//

var mini_currentRound = 100
var mini_playersItemCount = []
var mini_playersHands = []
var mini_numberOfItems = 0 // items in pot
var mini_botsInPot = [] // bots in the current pot
var mini_numberOfTickets = 0
var mini_playersTickets = {}
var mini_winningTicketPercentage = 0.00 // winning percentage
var mini_salt = ''
var mini_winningTicket = 0 // place in array of tickets
var mini_stringTicket = '' // string version of winning percentage
var mini_hash = ''
var mini_allTickets = []
var mini_itemsInPot = [] // items in pot
var mini_Players = [] //
var mini_clients = {} // object containing socket users
var mini_tradeIdsToCheck = [] // trade ids to check status on

// var mini = io.of('/mini')
io.of('/mini').on('connection', function (client) {
  client.emit('gimmedatinfo', 'hi')
  setTimeout(function () {
    client.emit('mini_adjustFront', {
    classids: mini_itemsInPot,
    players: mini_Players,
    tickets: mini_numberOfTickets,
    numberOfItems: mini_numberOfItems
  })
    client.emit('mini_roundInfo', {
      roundid: mini_currentRound,
      hash: mini_hash
    })
  }, 300)

  client.on('mini_connect', function (userid) {
    console.log("======================== " + userid + " Connected")
    mini_clients[userid] = client;
    for (var i in mini_clients) {
      if (mini_playersTickets[i]) {
        if (mini_clients[userid])
          io.of('/mini').to(mini_clients[i].id).emit('mini_userTickets', (mini_playersTickets[i] / mini_numberOfTickets))
      }
    }

    users.findOne({
        where: {
          steamid: userid
        }
      })
      .then(function (data) {
        if (!data.tradeurl || data.tradeurl == 'NULL' || data.tradeurl == '' || data.tradeurl.length < 8) {
          if (mini_clients[userid])
            io.of('/mini').to(mini_clients[userid].id).emit('mini_noToken', 'Hi')
        }
      })
  })
})

// =================================
// 
//   RESEND SOCKET INFO
//
// =================================
function mini_resendSocketInfo() {
	console.log("in round resend")
    io.of('/mini').emit('mini_adjustFront', {
      classids: mini_itemsInPot,
      players: mini_Players,
      tickets: mini_numberOfTickets,
      numberOfItems: (mini_numberOfItems === 0)? -1 : mini_numberOfItems
    })
    io.of('/mini').emit('mini_roundInfo', {
      roundid: mini_currentRound,
      hash: mini_hash
    })


  }
  // =================================
  // 
  //   SEND SOCKET INFO TO FRONTEND
  //
  // =================================
function mini_sendSocketInfo(itemsInPot, Players, numberOfTickets, numberOfItems) {
	console.log("in round send")
  io.of('/mini').emit('mini_adjustFront', {
    classids: itemsInPot,
    players: Players,
    tickets: numberOfTickets,
    numberOfItems: numberOfItems
  })
  io.of('/mini').emit('mini_roundInfo', {
    roundid: mini_currentRound,
    hash: mini_hash
  })
}


//
//
// io.of('/regs') POT DETAILS
//
//
var big_currentRound = 1000
var big_playersItemCount = []
var big_playersHands = []
var big_numberOfItems = 0 // items in pot
var big_numberOfTickets = 0
var big_playersTickets = {}
var big_winningTicketPercentage = 0.00 // winning percentage
var big_salt = ''
var big_winningTicket = 0 // place in array of tickets
var big_stringTicket = '' // string version of winning percentage
var big_hash = ''
var big_allTickets = []
var big_itemsInPot = [] // items in pot
var big_Players = [] //
var big_clients = {} // object containing socket users
var big_tradeIdsToCheck = [] // trade ids to check status on

// var io.of('/regs') = io.of('/io.of('/regs')')
io.of('/regs').on('connection', function (client) {
  setTimeout(function(){client.emit('gimmedatinfo', 'hi')},100)
  setTimeout(function () {
    client.emit('big_adjustFront', {
    classids: big_itemsInPot,
    players: big_Players,
    tickets: big_numberOfTickets,
    numberOfItems: big_numberOfItems
  })
    client.emit('big_roundInfo', {
      roundid: big_currentRound,
      hash: big_hash
    })
  }, 300)
  // console.log("client:", client)
  client.on('big_connect', function (userid) {
    console.log("======================== " + userid + " Connected")
    big_clients[userid] = client;
    for (var i in big_clients) {
      if (big_playersTickets[i]) {
        if (big_clients[userid])
          io.of('/regs').to(big_clients[i].id).emit('big_userTickets', (big_playersTickets[i] / big_numberOfTickets))
      }
    }

    users.findOne({
        where: {
          steamid: userid
        }
      })
      .then(function (data) {
        if (!data.tradeurl || data.tradeurl == 'NULL' || data.tradeurl == '' || data.tradeurl.length < 8) {
          if (big_clients[userid])
            io.of('/regs').to(big_clients[userid].id).emit('big_noToken', 'Hi')
        }
      })
      .catch(function(){

      })
  })
})

// =================================
// 
//   RESEND SOCKET INFO
//
// =================================
function big_resendSocketInfo() {
    io.of('/regs').emit('big_adjustFront', {
      classids: big_itemsInPot,
      players: big_Players,
      tickets: big_numberOfTickets,
      numberOfItems: (big_numberOfItems === 0)? -1 : big_numberOfItems
    })
    io.of('/regs').emit('big_roundInfo', {
      roundid: big_currentRound,
      hash: big_hash
    })
  }
  // =================================
  // 
  //   SEND SOCKET INFO TO FRONTEND
  //
  // =================================
function big_sendSocketInfo(itemsInPot, Players, numberOfTickets, numberOfItems) {
  io.of('/regs').emit('big_adjustFront', {
    classids: itemsInPot,
    players: Players,
    tickets: numberOfTickets,
    numberOfItems: numberOfItems
  })
  io.of('/regs').emit('big_roundInfo', {
    roundid: big_currentRound,
    hash: big_hash
  })
}
// SETTERS
setTimeout(function(){
  queue.create('getStartupInfo', {}).removeOnComplete(true).save()
  queue.create('big_getStartupInfo', {}).removeOnComplete(true).save()
}, 200)

queue.process('reset', function(job, done){
  console.log("in round reset")
  if(job.data.pot == 1){
    console.log("in round reset 1")
    big_itemsInPot = job.data.classids
      big_Players = job.data.players
      big_numberOfTickets = job.data.tickets
      big_numberOfItems = job.data.numberOfItems
      big_currentRound = job.data.roundid
      big_hash = job.data.hash
      big_resendSocketInfo()
      done(null, 'mini was updated')
  }
  if(job.data.pot == 2){
    console.log("in round reset 2")
    mini_itemsInPot = job.data.classids
      mini_Players = job.data.players
      mini_numberOfTickets = job.data.tickets
      mini_numberOfItems = job.data.numberOfItems
      mini_currentRound = job.data.roundid
      mini_hash = job.data.hash
      mini_resendSocketInfo()
      done(null, 'mini was updated')
  }
})
queue.process('update', function(job, done){
	console.log("in round update")
	if(job.data.pot == 1){
    console.log("in round reset 1")
		big_itemsInPot = job.data.classids
	    big_Players = job.data.players
	    big_numberOfTickets = job.data.tickets
	    big_numberOfItems = job.data.numberOfItems
	    big_currentRound = job.data.roundid
	    big_hash = job.data.hash
	    done(null, 'mini was updated')
	}
	if(job.data.pot == 2){
    console.log("in round update 2")
		mini_itemsInPot = job.data.classids
	    mini_Players = job.data.players
	    mini_numberOfTickets = job.data.tickets
	    mini_numberOfItems = job.data.numberOfItems
	    mini_currentRound = job.data.roundid
	    mini_hash = job.data.hash
	    done(null, 'mini was updated')
	}
})

queue.process('roundInfo', function(job, done){
	console.log("in round info")
	if(job.data.pot == 1){
		big_sendSocketInfo(job.data.classids, job.data.players, job.data.tickets, job.data.numberOfItems)
		big_itemsInPot = job.data.classids
	    big_Players = job.data.players
	    big_numberOfTickets = job.data.tickets
	    big_numberOfItems = job.data.numberOfItems
	    big_currentRound = job.data.roundid
	    big_hash = job.data.hash
	    done(null, 'mini was updated')
	}
	if(job.data.pot == 2){
		mini_sendSocketInfo(job.data.classids, job.data.players, job.data.tickets, job.data.numberOfItems)
		mini_itemsInPot = job.data.classids
	    mini_Players = job.data.players
	    mini_numberOfTickets = job.data.tickets
	    mini_numberOfItems = job.data.numberOfItems
	    mini_currentRound = job.data.roundid
	    mini_hash = job.data.hash
	    done(null, 'mini was updated')
	}
})

queue.process('playerMessage', function(job, done){
	if(job.data.pot === 1){
		if(big_clients[job.data.clientid])
			io.of('/regs').to(big_clients[job.data.clientid].id).emit('big_userMessage', job.data.message)
		done(null, 'mini was updated')
	}
	if(job.data.pot === 2){
		if(mini_clients[job.data.clientid])
			io.of('/mini').to(mini_clients[job.data.clientid].id).emit('mini_userMessage', job.data.message)
		done(null, 'mini was updated')
	}
})

queue.process('playersTickets', function(job, done){
  console.log("percentage",job.data.percentage)
	if(job.data.pot === 1){
		if(big_clients[job.data.clientid])
			io.of('/regs').to(big_clients[job.data.clientid].id).emit('big_userTickets', job.data.percentage)
		done(null, 'mini was updated')
	}
	if(job.data.pot === 2){
		if(mini_clients[job.data.clientid])
			io.of('/mini').to(mini_clients[job.data.clientid].id).emit('mini_userTickets', job.data.percentage)
		done(null, 'mini was updated')
	}
})

queue.process('winnerwinner', function(job, done){
	if(job.data.pot === 1){
		io.of('/regs').emit('big_winnerInfo', {
			name: job.data.name,
			percentage: job.data.percentage,
			salt: job.data.salt,
			winningPercentage: job.data.winningPercentage,
			amount: job.data.amount
		})
		done(null, 'mini was updated')
	}
	if(job.data.pot == 2){
		io.of('/mini').emit('mini_winnerInfo', {
			name: job.data.name,
			percentage: job.data.percentage,
			salt: job.data.salt,
			winningPercentage: job.data.winningPercentage,
			amount: job.data.amount
		})	
		done(null, 'mini was updated')
	}
})

queue.process('clean', function(job, done){
	if(job.data.pot == 1){
		io.of('/regs').emit('big_clean', {
      numberOfItems: 0
    })
    io.of('/regs').emit('big_roundInfo', {
      roundid: job.data.roundid,
      hash: job.data.hash
    })
		done(null, 'mini was updated')
	}
	if(job.data.pot == 2){
		io.of('/mini').emit('mini_clean', {
      numberOfItems: 0
    })
    io.of('/mini').emit('mini_roundInfo', {
      roundid: job.data.roundid,
      hash: job.data.hash
    })
		done(null, 'mini was updated')
	}
})

setInterval(function(){
  console.log("mini", Object.keys(mini_clients))
  console.log("big", Object.getOwnPropertyNames(big_clients))
}, 10000)