var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var bcrypt = require('bcrypt')

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var configDB = require('./config/database');
var Sequelize = require('sequelize');
var sequelize = new Sequelize('csgoparlor', 'root', 'snapple1');
var currentPot = sequelize.define('currentPot', {
  user: Sequelize.STRING,
  classid: Sequelize.STRING
});

var users = sequelize.define('users', {
  steamid:  {type: Sequelize.STRING, unique:true},
  displayname: Sequelize.STRING,
  tradeurl: Sequelize.STRING,
  fulltradeurl: Sequelize.STRING,
  photo: Sequelize.STRING
});

var rounds = sequelize.define('rounds', {
  hash: Sequelize.STRING,
  salt: Sequelize.STRING,
  winnerpercentage: Sequelize.DOUBLE,
  current: Sequelize.BOOLEAN,
  roundid: Sequelize.INTEGER,
  winner: Sequelize.STRING,
  tickets: Sequelize.INTEGER
});

sequelize.sync()


// USERS CONFIG


// SESSION configuration
mongoose.connect(configDB.url);

require('./config/passport')(passport);

// set up our express app
app.use(morgan('dev')); // log every request into the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get info from html forms

app.set('view engine', 'ejs');

// required for passport
app.use(session({
  secret: 'ilovemike'
})); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session
app.use(express.static(__dirname + "/views"));

// routes
require('./app/routes.js')(app, passport, currentPot, users, rounds, bcrypt); // load our routes and pass in our app fully configured passport

// launch
app.listen(port);
console.log(port);