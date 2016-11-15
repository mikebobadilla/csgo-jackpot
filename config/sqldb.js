module.exports = function(Sequelize, sequelize){
	var rounds = sequelize.define('rounds', {
  hash: Sequelize.STRING,
  salt: Sequelize.STRING,
  winnerpercentage: Sequelize.DOUBLE,
  current: Sequelize.BOOLEAN,
  roundid: Sequelize.INTEGER,
  winner: Sequelize.STRING,
  tickets: Sequelize.INTEGER
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

var smallPot = sequelize.define('smallpotitems', {
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
}