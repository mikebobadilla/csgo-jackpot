// config/passport.js

// load all the things we need
var SteamStrategy = require('passport-steam').Strategy;
// load the user model
var User = require('../app/models/user');
// load the auth variables
var configAuth = require('./auth');

// expose this function to our app using module.exports
module.exports = function (passport) {
  // ======================
  // passport session setup
  // ======================
  // required for persistent login sessions
  // passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });

  //====================
  // STEAM
  // ==================

  passport.use(new SteamStrategy({

      // pull in our app id and secret from our auth file
      apiKey: configAuth.steamAuth.apiKey,
      realm: configAuth.steamAuth.realm,
      returnURL: configAuth.steamAuth.callbackURL,
      profile: true
    },

    // steam will send back the token and profile
    function (identifier, profile, done) {
      
      //asynchronus
      process.nextTick(function () {

        //find the user int he database based on their steam id
        User.findOne({
          'steam.id': profile.id
        }, function (err, user) {

          // if there is an error, stop everything and return that
          // ie an error connecting to the database
          if (err)
            return done(err);

          // if the user is found, log them in
          if (user) {
          	user.steam.displayName = profile.displayName
          	user.save()
            return done(null, user); // user found, return that user	
          } else {
            var newUser = new User();

            // set all of the steam information in our user model
            newUser.steam.id = profile.id;
            newUser.steam.displayName = profile.displayName;
            newUser.steam.photo = profile.photos[2].value;
          };

          newUser.save(function (err) {
            if (err)
              throw err;

            // if successful, retun the new user
            return done(null, newUser);
          });
        });
      });
    }));
};
