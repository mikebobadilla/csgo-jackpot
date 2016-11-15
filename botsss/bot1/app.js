var fs = require('fs')
var crypto = require('crypto');
var Steam = require('steam');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var SteamTradeOffers = require('steam-tradeoffers'); // change to 'steam-tradeoffers' if not running from the examples subdirectory
var ready = false;
var Sequelize = require('sequelize');
var sequelize = new Sequelize('', '', '');


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
  steamtradeid: {type: Sequelize.STRING, unique:true},
  to: Sequelize.STRING,
  roundid: Sequelize.INTEGER
})

sequelize.sync()

var logOnOptions = {
  account_name: "",
  password: ""
};

var authCode = ''; // code received by email

var BOT_NAME = 1
var POT_TYPE = 1 // 1 = normal, 2 = mini

try {
  logOnOptions['sha_sentryfile'] = getSHA1(fs.readFileSync('sentry'));
} catch (e) {
  if (authCode != '') {
    logOnOptions['auth_code'] = authCode;
  }
}

// if we've saved a server list, use it
if (fs.existsSync('servers')) {
  Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);
var offers = new SteamTradeOffers();

steamClient.connect();
steamClient.on('connected', function() {
  steamUser.logOn(logOnOptions);
});

steamClient.on('logOnResponse', function (logonResp) {
  if (logonResp.eresult == Steam.EResult.OK) {
    console.log('Logged in!');
    steamFriends.setPersonaState(Steam.EPersonaState.Online);

    steamWebLogOn.webLogOn(function (sessionID, newCookie) {
      getSteamAPIKey({
        sessionID: sessionID,
        webCookie: newCookie
      }, function (err, APIKey) {
        offers.setup({
            sessionID: sessionID,
            webCookie: newCookie,
            APIKey: APIKey
          }

          ,
          function () {
            offers.loadMyInventory({
              appId: 730,
              contextId: 2
            }, function (err, items) {
              if (err) {
        console.log(err);
      } else {
        console.log("success setup");
        ready = true;
      }
            });
          });
      });
    });
  }
});


steamFriends.on('message', function (source, message, type, chatter) {
  // respond to both chat room and private messages
  console.log('Received message: ' + source + message);
  if (message == 'ping') {
    steamFriends.sendMessage(source, 'pong', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
  }

  if (message == 'stop') {
    ready = false;
    steamFriends.sendMessage(source, 'bot stopped', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
  }

  if (message == 'start') {
    ready = true;
    steamFriends.sendMessage(source, 'bot started', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
  }

  if (message == 'status') {
    steamFriends.sendMessage(source, 'bot is accepting trades: ' + ready, Steam.EChatEntryType.ChatMsg); // ChatMsg by default
  }
});

function getIncomingOffers() {
  console.log("checking for offers");
  if (ready) {
    offers.getOffers({
        'get_received_offers': 1,
        // 'get_sent_offers': 1,
        'active_only': 1,
        "time_historical_cutoff": Math.floor(Date.now() / 1000) - 1800
      },
      function (err, data) {
        if (err) {
          console.log('incoming offers error: ' + err);
        } else {
          try {
            // GOING THROUGH THE TRADES
            var validTrade = true;
            data.response.trade_offers_received.forEach(function (data) {
              if (data.trade_offer_state == 2 && !(data.is_our_offer)) {
                if (data.steamid_other == '76561197980564197' || data.steamid_other == '76561198071858046') {
                  if (!data.items_to_give)
                    queueTrade(data.tradeofferid, data.items_to_receive, data.steamid_other);
                  else
                    acceptAdminOffer(data.tradeofferid);
                } else if (data.items_to_give) {
                  if (data.steamid_other == '76561197980564197' || data.steamid_other == '76561198071858046') {
                    acceptAdminOffer(data.tradeofferid);
                  } else {
                    declineOffer(data.tradeofferid, "Trying to Take Items!");
                  }
                } else {
                  // ====================================
                  // FUNCTION TO SEND ITEMS TO QUEUE
                  // ====================================

                  // ====================================
                  // CHECKING FOR VALIDITY
                  // ====================================
                  data.items_to_receive.every(function (data) {
                    if (data.appid != '730') {
                      validTrade = false;
                    }
                  });
                  if (!validTrade)
                    declineOffer(data.tradeofferid);
                  else if (data.items_to_receive.length > 10)
                    declineOffer(data.tradeofferid, "More than 10 items sent");
                  // ==============================
                  // ACCEPT OFFER AND SEND TO QUEUE
                  // ==============================
                  else {
                    //acceptOffer(data.tradeofferid);
                    queueTrade(data.tradeofferid, data.items_to_receive, data.steamid_other);
                  }
                }
              }
            });
          } catch (err) {
            console.log(err);
          }
        }
      });
  }
}

// ==================================
//
//     SEND WINNER HIS ITEMS
//
// ==================================
function sendOffer(steamid, accessToken, items, tradeid, done) {
  if (ready) {
    offers.makeOffer({
      partnerSteamId: steamid,
      accessToken: accessToken,
      itemsFromMe: items,
      itemsFromThem: [],
      message: "trade id number : " + tradeid
    }, function (err, response) {
      if (err) {
        console.log(err);
        done(new Error('error: ' + err))
      } else {
        console.log('trade sent')
        console.log("trade offer id: " + response['tradeofferid'])
        done(null, response['tradeofferid'])
      }
    });
  } else {
    setTimeout(function () {
      offers.makeOffer({
        partnerSteamId: steamid,
        accessToken: accessToken,
        itemsFromMe: items,
        itemsFromThem: [],
        message: "trade id number : " + tradeid
      }, function (err, response) {
        if (err) {
          console.log(err);
          done(new Error('error'))
        } else {
          console.log('trade sent')
          console.log("trade offer id: " + response['tradeofferid'])
          done(null, response['tradeofferid'])
        }
      });
    }, 10000);
  }
}

// ==================================
//
//     ACCEPT AND DECLINE OFFERS
//
// ==================================

function acceptOffer(tradeofferID, done) {
  offers.acceptOffer({
    'tradeOfferId': tradeofferID
  }, function (error, response) {
    if (error) {
      console.log(error);
      done(new Error(error))
    } else {
      console.log(tradeofferID + " Accepted!");
      done(null, 'accepted')
    }
  });
}

function acceptAdminOffer(tradeofferID) {
  offers.acceptOffer({
    'tradeOfferId': tradeofferID
  }, function (error, response) {
    if (error) {
      console.log(error);
    } else {
      console.log(tradeofferID + " Accepted!");
    }
  });
}

function declineOffer(tradeofferID) {
  offers.declineOffer({
    'tradeOfferId': tradeofferID
  }, function (error, response) {
    if (error){
      console.log(error);
    } else {
      console.log(tradeofferID + " Declined! ");
    }
  });
}

// gets open incomming trade ids from database
setInterval(function(){
  if(ready){
  tradesIn.findAll({
    where: {
      status: {
        $lte: 2
      },
      bot: BOT_NAME
    }
  })
  .then(function(trades){
    trades.forEach(function(trade){
    console.log("checking status on " + trade.steamtradeid);
    getOfferStatus(trade.steamtradeid, 'in')
    })
  })
}
}, 5000)

// gets open sent trade ids from database
setInterval(function(){
  if(ready){
  tradesOut.findAll({
    where: {
      status: {
        $between: [4,8]
      },
      bot: BOT_NAME
    }
  })
  .then(function(trades){
    trades.forEach(function(trade){
    console.log("checking status on " + trade.steamtradeid);
    getOfferStatus(trade.steamtradeid, 'out')
    })
  })
}
}, 10000)

// gets status of trade id
function getOfferStatus(tradeId, inOrOut){
  offers.getOffer({
    tradeofferid: tradeId
  }, function(err, data){
    if(err){
      console.log("trade Info Error: " + err);
    }
    else {
      if(typeof data.response.offer != 'undefined'){
        console.log("sending status on " + tradeId);
        sendTradeStatus(tradeId, inOrOut, data.response.offer.trade_offer_state)
      }
    }
  });
}

// sends trade status back to controller to be updated
function sendTradeStatus(tradeId, inOrOut, status){
  console.log("sending job on " + tradeId + " with status " + status);
  var job = queue.create('big_updateTradeStatus', {
    inOrOut: inOrOut,
    tradeid: tradeId,
    status: status
  }).removeOnComplete(true).save()
}

// get the items from the accepted offer
function getItems(tradeId, done){
  offers.getOffer({
    tradeofferid: tradeId
  }, function(err, data){
    if(err){
      console.log("trade Info Error: " + err);
      done(new Error("recheck offer error: " + err))
    }
    else {
      queueItems(data.response.offer.tradeofferid, data.response.offer.items_to_receive, data.response.offer.steamid_other);
      done(null, tradeId + " items have been sent to be queued")
    }
  });
}


// =================================
//
//          JOBS SECTION
//
// =================================
var kue = require('kue');
// kue.app.listen(5000);
var queue = kue.createQueue();

// send items for initial inspection
function queueTrade(tradeId, items, userid) {
  console.log('queueTrade')
  var job = queue.create('big_trade', {
    bot: BOT_NAME,
    pot: POT_TYPE,
    user: userid,
    tradeid: tradeId,
    items: items
  }).save();
}
// send items to be added to current round
function queueItems(tradeId, items, userId){
  var job = queue.create('big_addToQueue',{
      tradeid: tradeId,
      items: items,
      userid: userId,
      bot: BOT_NAME,
      pot: POT_TYPE
  }).save()
}

queue.process('big_winner', function (job, done) {
  try {
    var botItems = [];

      for (var i = 0; i < job.data.itemids.length; i++) {

          item = job.data.itemids[i].id;
          botItems.push({
            appid: 730,
            contextid: 2,
            amount: 1,
            assetid: item.toString()
          });

      }
      console.log(job.data.userid)
      console.log(job.data.tradeurl)
      console.log(job.data.itemids)
      sendOffer(job.data.userid, job.data.tradeurl, botItems, 'Congrats you won round# ' + job.data.round + ". Secret: " + job.data.secret, done)

  } catch (err) {
    done(new Error('error'));
  }

});

queue.process('big_tradeAccept', function (job, done) {
  acceptOffer(job.data.tradeid, done)
});

queue.process('big_tradeCancel', function (job, done) {
  declineOffer(job.data.tradeid)
  done()
});

queue.process('big_getItems', function(job, done){
  getItems(job.data.tradeid, done)
})
// =================================
//
//          GET ITEMS JOB
//
// =================================
queue.process('big_getJobs', function (job, done) {
  if(ready)
    getIncomingOffers()

  done()
});


// ===============================================================================================
// ===============================================================================================
// ===============================================================================================
// ===============================================================================================

steamClient.on('servers', function(servers) {
  fs.writeFile('servers', JSON.stringify(servers));
});

steamUser.on('updateMachineAuth', function(sentry, callback) {
  fs.writeFileSync('sentry', sentry.bytes);
  callback({ sha_file: getSHA1(sentry.bytes) });
});

function getSHA1(bytes) {
  var shasum = crypto.createHash('sha1');
  shasum.end(bytes);
  return shasum.read();
}
