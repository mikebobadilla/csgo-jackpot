var Promise = require('bluebird')
var http = require('http');
http.globalAgent.maxSockets = 100;
var kue = require('kue');
var queue = kue.createQueue();
//kue.app.listen(3001);
var bcrypt = require('bcrypt-node');
var Sequelize = require('sequelize');
var sequelize = new Sequelize('csgoparlor', 'root', 'snapple1');

var SimpleNodeLogger = require('simple-node-logger'),
    opts = {
        logFilePath:'big_logfile.log',
        timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
    },
    log = SimpleNodeLogger.createSimpleLogger( opts );


//newRound() //  after all variables and sockets have been registered - to be changed soon
var currentRound = 2
var SIZE_OF_POT = 50
var ready = true
var forceOff = false

// =================================
// 
//      SET DATABASE INFO
//
// =================================
var rounds = sequelize.define('rounds', {
  hash: Sequelize.STRING,
  salt: Sequelize.STRING,
  winnerpercentage: Sequelize.DOUBLE,
  current: Sequelize.BOOLEAN,
  roundid: {type: Sequelize.INTEGER, unique: true },
  winner: Sequelize.STRING,
  tickets: Sequelize.INTEGER,
  type: Sequelize.INTEGER
});

var users = sequelize.define('users', {
  steamid: {
    type: Sequelize.STRING,
    unique: true
  },
  displayname: Sequelize.STRING,
  tradeurl: Sequelize.STRING,
  photo: Sequelize.STRING
});

var deposits = sequelize.define('deposits', {
  roundid: Sequelize.INTEGER,
  steamid: Sequelize.STRING,
  value: Sequelize.INTEGER,
  numberofitems: Sequelize.INTEGER,
  status: Sequelize.STRING,
  tradeid: Sequelize.STRING,
  winner: Sequelize.BOOLEAN,
})

var items = sequelize.define('items', {
  marketname: Sequelize.STRING,
  avg7price: Sequelize.STRING,
  avg30price: Sequelize.STRING,
  currentprice: Sequelize.STRING,
  classid: Sequelize.STRING
});

var bigPot = sequelize.define('bigpotitems', {
  roundid: Sequelize.INTEGER,
  classid: Sequelize.STRING,
  value: Sequelize.INTEGER,
  bot: Sequelize.INTEGER
});

var bots = sequelize.define('bots', {
  bot: {
    type: Sequelize.INTEGER,
    unique: true
  },
  url: Sequelize.STRING
})

var botItems = sequelize.define('botitems', {
  bot: Sequelize.INTEGER,
  assetid: Sequelize.STRING,
  classid: Sequelize.STRING,
  name: Sequelize.STRING
})

var tradesIn = sequelize.define('tradesins', {
  bot: Sequelize.INTEGER,
  status: Sequelize.INTEGER,
  steamtradeid: {
    type: Sequelize.STRING,
    unique: true
  },
  from: Sequelize.STRING
})

var tradesOut = sequelize.define('tradesouts', {
  bot: Sequelize.INTEGER,
  tradesecret: Sequelize.STRING,
  status: Sequelize.INTEGER,
  steamtradeid: {
    type: Sequelize.STRING,
    unique: true
  },
  to: Sequelize.STRING,
  roundid: Sequelize.INTEGER,
  attempts: Sequelize.INTEGER
})

var tradesToSend = sequelize.define('tradesToSends', {
  tradesecret: Sequelize.STRING,
  classid: Sequelize.STRING,
  assetid: Sequelize.STRING,
  bot: Sequelize.INTEGER
})

sequelize.sync()

// =================================
// 
//      SET ROUND INFORMATION
//
// =================================
var playersItemCount = []
var playersHands = []
var numberOfItems = 0 // items in pot
var botsInPot = [] // bots in the current pot
var numberOfTickets = 0
var playersTickets = {}
var winningTicketPercentage = 0.00 // winning percentage
var salt = ''
var winningTicket = 0 // place in array of tickets
var stringTicket = '' // string version of winning percentage
var hash = ''
var allTickets = []

// =================================
// 
//   SET SOCKET INFO AND FUNCTIONS
//
// =================================
var itemsInPot = [] // items in pot
var Players = [] //
var clients = {} // object containing socket users
var tradeIdsToCheck = [] // trade ids to check status on

// =================================
// 
//   RESET DATA ON CRASH
//
// =================================
queue.process('big_getStartupInfo', function(job, done){
  resendSocketInfo() 
  done()
})

function resendSocketInfo() {
  queue.create('reset', {
    pot: 1, // 1 for regular | 2 for mini
    classids: itemsInPot,
    players: Players,
    tickets: numberOfTickets,
    numberOfItems: numberOfItems,
    roundid: currentRound,
    hash: hash
  }).removeOnComplete(true).save()
}

function roundUpdateInfo() {
  queue.create('update', {
    pot: 1, // 1 for regular | 2 for mini
    classids: itemsInPot,
    players: Players,
    tickets: numberOfTickets,
    numberOfItems: numberOfItems,
    roundid: currentRound,
    hash: hash
  }).removeOnComplete(true).save()
}

function sendSocketInfo(itemsInPot, Players, numberOfTickets, numberOfItems){
  queue.create('roundInfo', {
    pot: 1, // 1 for regular | 2 for mini
    classids: itemsInPot,
    players: Players,
    tickets: numberOfTickets,
    numberOfItems: numberOfItems,
    roundid: currentRound,
    hash: hash
  }).removeOnComplete(true).save()
}

function sendPlayersInfo(){
  queue.create('roundInfo', {
    pot: 1, // 1 for regular | 2 for mini
    classids: itemsInPot,
    players: Players,
    tickets: numberOfTickets,
    numberOfItems: numberOfItems,
    roundid: currentRound,
    hash: hash
  }).removeOnComplete(true).save()
}

function sendUserMessage(clientId, message){
  queue.create('playerMessage', {
    pot : 1,
    clientid: clientId,
    message: message
  }).removeOnComplete(true).save()
}

function sendUserTickets(clientId, percentage){
  log.info("percentage",percentage)
  queue.create('playersTickets', {
    pot : 1,
    clientid: clientId,
    percentage: percentage
  }).removeOnComplete(true).save()
}

function winnerInfo(name, percentage, salt, winTicket, numTickets){
  queue.create('winnerwinner', {
    pot: 1,
    name: name, 
    percentage: percentage, 
    salt: salt,
    winningPercentage: winTicket,
    amount: numTickets 
  }).removeOnComplete(true).save()
}

function clean(){
  queue.create('clean', {
    pot: 1,
      numberOfItems: 0,
      roundid: currentRound,
      hash: hash
    }).removeOnComplete(true).save()
}

rounds.findOne({
    where: {
      current: true,
      type: 1
    }
  })
  .then(function (round) {
    currentRound = round.roundid;
    salt = round.salt;
    winningTicket = round.winnerpercentage;
    hash = round.hash;
    deposits.findAll({
        where: {
          roundid: round.roundid
        }
      })
      .then(function (deposit) {
        deposit.forEach(function (item) {
          //          log.info(item)
          if (playersItemCount[item.steamid]) {
            playersItemCount[item.steamid] += item.numberofitems
            numberOfItems += item.numberofitems
          } else {
            playersItemCount[item.steamid] = item.numberofitems
            numberOfItems += item.numberofitems
          }
          if (playersTickets[item.steamid]) {
            playersTickets[item.steamid] += item.value
            numberOfTickets += item.value
            for (var i = 0; i < item.value; i++) {
              allTickets.push(item.steamid);
            }
            users.findOne({
                where: {
                  steamid: item.steamid
                }
              })
              .then(function (data) {
                Players.unshift({
                  name: decodeURI(data.displayname),
                  numberOfItems: item.numberofitems,
                  value: item.value / 100,
                  photo: data.photo
                })
              })
          } else {
            playersTickets[item.steamid] = item.value
            numberOfTickets += item.value
            for (var i = 0; i < item.value; i++) {
              allTickets.push(item.steamid);

            }
            users.findOne({
                where: {
                  steamid: item.steamid
                }
              })
              .then(function (data) {
                Players.unshift({
                  name: decodeURI(data.displayname),
                  numberOfItems: item.numberofitems,
                  value: item.value / 100,
                  photo: data.photo
                })
              })
          }
        })

        ready = true;
        setTimeout(resendSocketInfo, 200)
      });
    bigPot.findAll({
        where: {
          roundid: round.roundid
        }
      })
      .then(function (data) {
        data.forEach(function (item) {
          itemsInPot.push({
            classid: item.classid,
            value: item.value
          })
        })
      });
  }).
  catch(function(){setTimeout(newRound,100)});


// =================================
// 
//  GET INCOMMING TRADE INFORMATION
//
// =================================
queue.process('big_trade', function (job, done) {
  log.info('trade job')
  sendUserMessage(job.data.user, "Got your trade and were processing it")

  updatedb(job.data.user)
  getUserInfo(job.data.user, function (user) {
    checkHand(user, job.data.items, function (result) {
      if (result == true) {
        addTradeInDB(job.data.user, job.data.tradeid, job.data.bot)
        acceptTrade(job.data.user, job.data.tradeid, job.data.items, job.data.bot, done);
      } else {
        sendUserMessage(job.data.user, "Trade Was Declined")
        cancelTrade(job.data.tradeid, done);
      }
    })
  })
});

// adds trade into database with status #1 (not actioned yet)
function addTradeInDB(user, tradeId, bot) {
  tradesIn.create({
      bot: bot,
      steamtradeid: tradeId,
      status: 1,
      from: user
    })
    .then(function () {
      log.info(tradeId + " was added to the database")
    })
    .catch(function (err) {
      log.info(tradeId + ": " + err)
    })
}

// update trade status from bot | if status is 3(accepted), send for items to be added to queue
queue.process('big_updateTradeStatus', function (job, done) {
  if (job.data.inOrOut === 'in') {
    tradesIn.findOne({
        where: {
          steamtradeid: job.data.tradeid
        }
      })
      .then(function (trade) {
        if (job.data.status > trade.status) {
          updateTradeInDB(job.data.tradeid, job.data.status, done)
          if (job.data.status === 3)
            getTradeItems(job.data.tradeid)
        } else {
          done(null, job.data.tradeid + " has already been completed.")
        }
      })
  } else if (job.data.inOrOut === 'out') {
    var okCodes = [2, 3, 4, 6, 7, 10]
    var resendCodes = [5, 8]
    tradesOut.findOne({
        where: {
          steamtradeid: job.data.tradeid
        }
      })
      .then(function (trade) {
        if(job.data.status === 3)
          updateTradeSent(job.data.tradeid, 80, (trade.attempts + 1), done)

        if (job.data.status > trade.status) 
          updateTradeSent(job.data.tradeid, job.data.status, (trade.attempts + 1), done)
          if ((resendCodes.indexOf(job.data.status) != -1))
            resendTrade(trade.tradesecret, done)
         
      
        
          done(null, job.data.tradeid + " has already been completed.")
        
      })

  }
})

function resendTrade(secret, done) {
  log.info("In resendTrade")
  tradesOut.findOne({
      where: {
        tradesecret: secret
      }
    })
    .then(function (trade) {
      tradesToSend.findAll({
          where: {
            tradesecret: secret
          }
        })
        .then(function (items) {
          var classids = items.map(function (obj) {
            return obj.classid
          })
          itemsToSend(classids)
            .then(function (itemsss) {
              users.findOne({
                  where: {
                    steamid: trade.to
                  }
                })
                .then(function (user) {
                  sendWinnerItems(user.steamid, user.tradeurl, itemsss, trade.roundid, secret);

                  updateTradeSent(trade.steamtradeid, 99, 99, done)
                })

            })
        })
    })
}

function updateTradeSent(tradeId, status, attempts, done) {
  tradesOut.update({
      status: status,
      attempts: attempts
    }, {
      where: {
        steamtradeid: tradeId
      }
    })
    .then(function (trade) {
      // log.info(trade)
      log.info(tradeId + " was updated in the database")
      done(null, tradeId + " was updated in the database")
    })
    .catch(function (err) {
      log.info(tradeId + ": " + err)
      done(new Error(tradeId + " " + err))
    })
}

function getTradeItems(tradeId) {
  log.info('in getTradeItems')
  var job = queue.create('big_getItems', {
    tradeid: tradeId
  }).save(function (err) {
    if (!err) log.info(tradeId + ' sent to be fetched')
  })
}

// updates trade in database with new status
function updateTradeInDB(tradeId, status, done) {
    log.info('in updateTradeInDB')
    tradesIn.update({
        status: status
      }, {
        where: {
          steamtradeid: tradeId
        }
      })
      .then(function (trade) {
        // log.info(trade)
        log.info(tradeId + " was updated in the database")
        done(null, tradeId + " was updated in the database")
      })
      .catch(function (err) {
        log.info(tradeId + ": " + err)
        done(new Error(tradeId + " " + err))
      })

  }
  // =================================
  // 
  //  GET TRADE INFO TO QUEUE
  //
  // =================================

queue.process('big_addToQueue', function (job, ctx, done) {
  log.info('in addToQueue')
    // pause bot so there are on conflicts
  if ((job.data.items + numberOfItems) >= SIZE_OF_POT) {
    ctx.pause(5000, function () {
      setTimeout(function () {
        ctx.resume()
      })
    }, 8000)
  }

  playersHands.push(createHand(job.data.userid, job.data.items, job.data.tradeid, job.data.bot));
  playersItemCount[job.data.userid] = job.data.items.length
  done()
});


// =================================
// 
//  Get users info from database
//
// =================================
function getUserInfo(steamid, callback) {
  log.info('in getUserInfo')
  users.findOne({
      where: {
        steamid: steamid
      }
    })
    .then(function (user) {
      callback(user)
    })
    .catch(function (err) {
      log.info(err)
    })
}

// =================================
// 
//  CHECK HAND FOR VALIDITY
//
// =================================
function checkHand(user, itemsInTrade, result) {
    log.info('in checkHand')
    var totalValue = 0
    var itemLessThan5 = false

    if (!user.tradeurl || user.tradeurl == 'NULL' || user.tradeurl == '' || user.tradeurl.length < 8)
        result(false)
    else {
      itemsInTrade.forEach(function (data) {
        // log.info("TOTAL VALUE ================ " + totalValue)
        // log.info("CLASSSSSID ================ " + data.classid)
        items.findOne({
            where: {
              classid: data.classid
            }
          })
          .then(function (item) {
            if (item.currentprice == 'NULL')
              result(false)
            else if(item.currentprice < 5)
              itemLessThan5 = true
            else {
              // log.info("WE GT HERE ================ ")
              // log.info("CURRENT PRICE ================ " + item.currentprice)
              totalValue += (item.currentprice * 100)
            }

          })
          .catch(function (err) {
            log.info('CATCH')
            result(false)
          })

      })
      setTimeout(function () {
        if(itemLessThan5)
          result(false)
        else if (totalValue.toFixed(0) < 500) {
          log.info("FALSE ================ " + totalValue.toFixed(0))
          result(false)
        } else {
          log.info("TRUE ================ " + totalValue.toFixed(0))
          result(true)
        }
      }, 300)
    }
  }
  // =================================
  // 
  //  CREATE HAND FROM DEPOSIT
  //
  // =================================
function getTickets(classid2, callback) {
  items.findOne({
      where: {
        classid: classid2
      }
    })
    .then(function (item) {
      callback(item.currentprice * 100)
    })
}

function addBotToPot(botId) {
  if (botsInPot.indexOf(botId) < 0)
    botsInPot.push(botId)

}

function createHand(userid, itemsInTrade, tradeInId, bot) {
  log.info('in createHand')
  sendUserMessage(userid, "Trade Accepted")
  var hand = {};
  var totalValue = 0;
  hand.itemsDeposited = [];
  hand.player = userid;
  hand.numberOfItems = 0;
  var counter = 0;
  log.info("userid: " + userid)
  itemsInTrade.forEach(function (data) {
    items.findOne({
        where: {
          classid: data.classid
        }
      })
      .then(function (item) {
        function ticketProcess(tickets) {
          for (var i = 0; i < tickets; i++) {
            allTickets.push(userid);
            totalValue++
            //            log.info('totalValue: ' + totalValue)
          }
          // log.info('tickets: ' + tickets)
          numberOfTickets += tickets;
          // log.info('numberOfTickets: ' + numberOfTickets)
          if (playersTickets[userid])
            playersTickets[userid] += tickets;
          else
            playersTickets[userid] = tickets;

          itemsInPot.push({
            classid: data.classid.toString(),
            value: tickets.toFixed(0)
          })

          bigPot.create({
            roundid: currentRound,
            classid: data.classid.toString(),
            value: tickets.toFixed(0),
            bot: bot
          })

          itemsInPot = itemsInPot.sort(function (a, b) {
            return b.value - a.value
          })

        }

        var tickets = 0
        if (item.currentprice) {
          tickets = (item.currentprice * 100)
          // log.info('tickets: ' + tickets)
          ticketProcess(tickets)
        } else {
          getUrl(userid, getInfo)
          getTickets(data.classid, ticketProcess)
        }

        numberOfItems++;
        // log.info('numberOfItems: ' + numberOfItems)
        hand.numberOfItems++;

        hand.itemsDeposited.push({
          item: data.classid,
          value: data.currentprice
        });
      })
      .catch(function (err) {
        log.info(err)
      })
    counter++;
    // log.info('coutner: ' + counter)
    if (counter >= itemsInTrade.length) {
      setTimeout(function () {
        sendToWeb()
      }, 300)
    }
    if (numberOfItems >= SIZE_OF_POT) {
      setTimeout(function () {
        chooseWinner();
      }, 1000);
    }
  })

  // =================================
  // 
  //  SEND TO FRONT END
  //
  // =================================
  function sendToWeb() {
    // log.info('numberOfTickets: ' + numberOfTickets)
      //    log.info('allTickets: ' + allTickets)
    // log.info('totalValue: ' + totalValue)
    if (counter >= itemsInTrade.length) {
      setTimeout(function () {
        deposits.create({
          roundid: currentRound,
          steamid: userid,
          value: totalValue,
          numberofitems: hand.numberOfItems,
          status: 'accepted',
          tradeid: tradeInId,
          winner: 0,
        })
      }, 1000)
      log.info('end of create hand');
      getUserInfo(userid, function (data) {
        Players.push({
          name: decodeURI(data.displayname),
          numberOfItems: itemsInTrade.length,
          value: totalValue / 100,
          photo: data.photo
        })
        setTimeout(function () {
            sendSocketInfo(itemsInPot, Players, numberOfTickets, numberOfItems)
          }, 300)
      })
        sendPercentages(userid)

    }
  }



  return hand;
}

function sendPercentages(userid) {
    setTimeout(function () {
        if (playersTickets[userid]) {
            sendUserTickets(userid, (playersTickets[userid] / numberOfTickets))
        }
    }, 500)
  }
  // =================================
  // 
  //  CANCEL TRADE
  //
  // =================================
function cancelTrade(tradeId, done) {
    log.info("WE GOT HERE TO CANCEL ================ ")
    var job = queue.create('big_tradeCancel', {
      tradeid: tradeId
    }).save(function (err) {
      if (!err) log.info("tradid: " + tradeId);
    });

    job.on('complete', function () {
      done(null, 'Job' + tradeId + ' was canceled!')
    })

    job.on('failed', function (result) {
      done(new Error('Problem canceling trade: ' + result))
    })
  }
  // =================================
  // 
  //  ACCEPT TRADE
  //
  // =================================
function acceptTrade(userid, tradeId, items, bot, done) {
  var accept = queue.create('big_tradeAccept', {
    tradeid: tradeId
  }).save(function (err) {
    if (!err) log.info(tradeId);
  });

  accept.on('complete', function () {
    log.info(tradeId + ' marked as accepted')

    if ((numberOfItems + items.length) >= SIZE_OF_POT) {
      ready = false;
    }
    done();
  })

  accept.on('failed', function (result) {
    log.info('ERROR: ' + result)
    done(new Error(result))
  })
}

function removeTradeFromArray(tradeId, callback) {
  var index = tradeIdsToCheck.indexOf(tradeId)
  var tradeToFetch = tradeIdsToCheck.splice(index, 1)
  callback(tradeToFetch)
}

function setTradeToCanceled(tradeId) {
    tradesIn.update({
        status: 4
      }, {
        where: {
          tradeid: tradeId
        }
      })
      .then(function (data) {
        log.info(tradeId + ' was set to canceled')
      })
  }
  // =================================
  // 
  //  SELECT ITEMS TO KEEP
  //
  // =================================

function getPaid() {
  return new Promise(function (resolve) {
    var tax = numberOfTickets * .05
    var margin = numberOfTickets * .01
    var haveItem = false;
    var newItems = []
    itemsInPot = itemsInPot.sort(function (a, b) {
      return a.value - b.value
    })

    log.info("tax " + tax)
    log.info("margin " + margin)
    setTimeout(function () {
        log.info("====================LEVEL 1 ==========================")
      itemsInPot.forEach(function (item) { //  get an item between 5% and 6%
        if (!haveItem) {
          if ((item.value <= (tax + margin)) && (item.value >= tax)) haveItem = true
          else
            newItems.push(item.classid)
        } else
          newItems.push(item.classid)
      })
      if (!haveItem) { //  get an item between 5% and 7%
        newItems = []
          log.info("====================LEVEL 2 ==========================")
        itemsInPot.forEach(function (item) {

          if (!haveItem) {
            if ((item.value <= (tax + margin + margin)) && (item.value >= tax)) haveItem = true
            else
              newItems.push(item.classid)
          } else
            newItems.push(item.classid)
        })
      }
      if (!haveItem) { //  get items adding up to 7%
        itemsInPot = itemsInPot.sort(function (a, b) {
          return b.value - a.value
        })
        newItems = []
        var saveItems = [] //  where we save the files being removed
        var collection = tax + margin + margin // ~7% 
          log.info("====================LEVEL 3 ==========================")
        itemsInPot.forEach(function (item) {

          if (collection > 2) {
            if (collection >= item.value) {
              collection = collection - item.value
              saveItems.push(item)
            } else
              newItems.push(item.classid)
          } else
            newItems.push(item.classid)
        })
      }
      return resolve(newItems)
    }, 200)
  })
}

// =================================
// 
//  SELECT ITEMS TO SEND
//
// =================================
function itemsToSend(itemIds) {
    return new Promise(function (resolve) {
      var finalItems = []

      getBotItems(1)
        .then(function (inventory) {
          //          log.info("item ids: " + typeof itemIds)
          console.log("inventory", inventory)
          for (var item in inventory) {
            if (itemIds.indexOf(inventory[item].classid) > -1) {
              var pos = itemIds.indexOf(inventory[item].classid)
              itemIds.splice(pos, 1)
              finalItems.push({
                id: inventory[item].id,
                classid: inventory[item].classid
              })
            }
            // log.info(inventory[item].id)
          }
          //          log.info(finalItems)
          return resolve(finalItems)
        })
    })

  }
  //}
  // =================================
  // 
  //  GET BOTS ITEMS
  //
  // =================================
function getBotItems(botId) {
    return new Promise(function (resolve) {
      bots.findOne({
          where: {
            bot: botId
          }
        })
        .then(function (bot) {
          url = bot.url + "/inventory/json/730/2"
          http.get(url, function (res) {
            var body = '';

            res.on('data', function (chunk) {
              body += chunk;
            });

            res.on('end', function () {

              try {
                var steam = JSON.parse(body);

                resolve(steam.rgInventory)

              } catch (err) {
                log.info("friends Error: " + err);
              }
            });
          }).on('error', function (e) {
            log.info("Got error: ", e);
          });
        })
    })
  }
  // =================================
  // 
  //  GET PLAYER INFO
  //
  // =================================
function getUrl(steamId, callback) {
  var url = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=6B67624F7BDB72AE0C6A2B1306D049AE&steamids=" + steamId;
  log.info('getInfo:' + steamId);
  http.get(url, function (res) {
    var body = '';

    res.on('data', function (chunk) {
      body += chunk;
    });

    res.on('end', function () {
      var steam = JSON.parse(body)
      callback(steam.response.players[0].profileurl)
    });
  }).on('error', function (e) {
    log.info("Got error: ", e);
  });
}

// =================================
// 
//  ADD PLAYER CLASSID TO DATABASE
//
// =================================
function getInfo(url) {
    url += "inventory/json/730/2"
    http.get(url, function (res) {
      var body = '';

      res.on('data', function (chunk) {
        body += chunk;
      });

      res.on('end', function () {

        try {
          var steam = JSON.parse(body);
          for (var mykey in steam.rgDescriptions) {
            items.update({
              classid: steam.rgDescriptions[mykey].classid
            }, {
              where: {
                marketname: encodeURI(steam.rgDescriptions[mykey].market_hash_name)
              }
            })
          }
          return resolve()
        } catch (err) {
          log.info("friends Error: " + err);
        }
      });
    }).on('error', function (e) {
      log.info("Got error: ", e);
    });
  }
  // =================================
  // 
  //  ADD PLAYER CLASSID TO DATABASE
  //
  // =================================
function updatedb(user) {
  getUrl(user, function (url) {
    url += "inventory/json/730/2"
    http.get(url, function (res) {
      var body = '';

      res.on('data', function (chunk) {
        body += chunk;
      });

      res.on('end', function () {

        try {
          var steam = JSON.parse(body);

          for (var mykey in steam.rgDescriptions) {
            items.update({
              classid: steam.rgDescriptions[mykey].classid
            }, {
              where: {
                marketname: encodeURI(steam.rgDescriptions[mykey].market_hash_name)
              }
            })
          }

        } catch (err) {
          log.info("friends Error: " + err);
        }
      });
    }).on('error', function (e) {
      log.info("Got error: ", e);
    });
  })
}

// =================================
// 
//  SELECT WINNER
//
// =================================
function chooseWinner() {
  var winner = Math.floor((numberOfTickets - 0.0000000001) * (winningTicket / 100));
  log.info('==========================');
  log.info('var winner: ' + winner);
  log.info("array winner " + allTickets[winner]);



  users.findOne({
      where: {
        steamid: allTickets[winner]
      }
    })
    .then(function (user) {
      getPaid()
        .then(itemsToSend)
        .then(function (itemsss) {
          //          log.info(itemsss)
          winnerInfo(decodeURI(user.displayname), (playersTickets[allTickets[winner]] / numberOfTickets), salt, winningTicket, numberOfTickets)
          var secret = bcrypt.genSaltSync().substr(9)
          setItemsInDB(itemsss, secret)
          setTimeout(function () {
            
              sendUserMessage(user.steamid, "Congratulations! You won round# " + currentRound + " Secret: " + secret)
          }, 100)

          sendWinnerItems(user.steamid, user.tradeurl, itemsss, currentRound, secret);
          newRound();
        })

    })

  rounds.update({
    winner: allTickets[winner],
    current: false,
    tickets: numberOfTickets
  }, {
    where: {
      roundid: currentRound
    }
  })
}

function setItemsInDB(itemsss, secret) {
  itemsss.forEach(function (item) {
    tradesToSend.create({
      bot: 1,
      classid: item.classid,
      assetid: item.id,
      tradesecret: secret
    })
  })
}


// =================================
// 
//  SEND ITEMS TO WINNER
//
// =================================
function sendWinnerItems(winnerId, tradeUrl, items, roundNumber, secret) {
  // log.info("sendWinner items: " + items)
  tradesOut.create({
    tradesecret: secret,
    roundid: roundNumber,
    to: winnerId,
    status: 1,
    bot: 1
  })
  var win = queue.create('big_winner', {
      userid: winnerId,
      tradeurl: tradeUrl,
      itemids: items,
      round: roundNumber,
      secret: secret
    })
    .delay(5000)
    .save(function (err) {
      if (err) log.info('trade didnt send');
    });

  win.on('complete', function (result) {
    log.info("win complete: " + result)
    rounds.update({
      winner: winnerId
    }, {
      where: {
        roundid: roundNumber
      }
    })

    updateTradeOutDB(result, 5, secret)
  })
}

// updates trade in database with new status
function updateTradeOutDB(tradeId, status, secret) {
  log.info('in updateTradeInDB')
  tradesOut.update({
      status: status,
      steamtradeid: tradeId
    }, {
      where: {
        tradesecret: secret
      }
    })
    .then(function (trade) {
      log.info(tradeId + " was updated in the database")
    })
    .catch(function (err) {
      log.info(tradeId + ": " + err)
    })

}

// =================================
// 
//   NEW ROUND | RESET EVERYTHING
//
// =================================
function newRound() {
  itemsInPot = []
  botsInPot = []
  Players = []
  playersTickets = {}
  salt = bcrypt.genSaltSync()
  winningTicket = genTicket()
  stringTicket = winningTicket.toString()
  hash = bcrypt.hashSync(stringTicket, salt)
  hash = hash.slice(29)
  log.info('winning ticket: ' + winningTicket)
  currentRound++
  playersHands = []
  numberOfItems = 0
  numberOfTickets = 0
  allTickets = []
  playersItemCount = []
  setTimeout(clean , 5000)

  setTimeout(function () {
    rounds.create({
      hash: hash,
      salt: salt,
      winnerpercentage: winningTicket,
      roundid: currentRound,
      current: true,
      type: 1
    }).then(function () {
      ready = true;
      roundUpdateInfo()
    }).catch(function(){
      newRound()
    })
  }, 500)
}

// =================================
// 
//    GENERATES WINNING TICKET
//
// =================================
function genTicket() {
  var percent = function(){
    var temp = 1.00;
    for(var i = 0; i < (Math.floor(Math.random() * 3) + 1); i++){
      temp *= (Math.random() + .01)
    }
    return temp;
  }
  return (percent() * 100)
}

setInterval(function () {
  if (numberOfItems >= SIZE_OF_POT) {
    chooseWinner();
  }
}, 15000)

setInterval(function () {
  if (ready && !forceOff) {
    var job = queue.create('big_getJobs', {}).removeOnComplete(true)
      .save(function (err) {
        if (err) log.info('job didnt fire');
      });
  }
}, 10000)