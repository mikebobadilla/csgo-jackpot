module.exports = function (app, passport, currentPot, users, rounds, bcrypt) {

  // Home Page
  app.get('/', addToDb, function (req, res) {
      res.render('big.ejs', {
            user: req.user
           });
  });

  app.get('/mini', addToDb, function (req, res) {
      res.render('index.ejs', {
            user: req.user
           });
  });


  // History Page
  app.get('/history', isLoggedIn, function (req, res) {

    res.render('history.ejs', {
      user: req.user
    });
  });

  // Provably Fair Page
  app.get('/fair', function (req, res) {

    res.render('fair.ejs', {
      user: req.user
    });
  });

  app.post('/fair', function(req, res){
    res.send(bcrypt.compareSync(req.body.percentage, req.body.salt + req.body.hash))
  })

  app.get('/support', function(req, res){
    res.render('support.ejs', {
      user: req.user
    });
  })

  app.get('/play', function(req, res){
    res.render('play.ejs', {
      user: req.user
    });
  })

  app.get('/dashboardz', isLoggedIn, function(req, res){
    if(req.user.steam.id == '' || req.user.steam.id == '')
      res.render('dashboard.ejs', {
        user: req.user
    });
    else
      res.redirect('/')
  })

  // ===============
  // PROFILE SECTION
  // ===============
  // we will want this protected so you have to be logged in to visit
  // we will use route middleware to verify this (the isLoggedIn function)
  app.get('/profile', isLoggedIn, function (req, res) {
    users.findOne({
        where: {
          steamid: req.user.steam.id
        }
      })
      .then(function (dbuser) {
        res.render('profile.ejs', {
          user: dbuser.steamid,
          displayName: decodeURI(dbuser.displayname),
          tradeUrl: dbuser.fulltradeurl

        });
      })
      .catch(function () {
        res.redirect('/');
      })
  });
  // ===============
  // STEAM ROUTES
  // ===============
  app.get('/auth/steam', passport.authenticate('steam', {
    failureRedirect: '/'
  }));

  // handle the callback after facebook has authenticated the user
  app.get('/auth/steam/callback',
    passport.authenticate('steam', {
      successRedirect: '/',
      failureRedirect: '/'
    }));

  // add Trade Url to users record
  app.post('/tradeUrl', function (req, res) {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", "<YOUR URL>");
    console.log(req.body)
    var tradeURL = req.body.tradeurl.split("=");
    if (req.isAuthenticated()) {
      users.update({
        tradeurl: tradeURL[tradeURL.length - 1],
        fulltradeurl: req.body.tradeurl
      }, {
        where: {
          steamid: req.user.steam.id
        }
      }).then(function (ress) {
        res.send(tradeURL[tradeURL.length - 1])
      })

    } else {
      res.json({
        message: 'Not Logged In'
      })
    }
    //      console.log(req.body)
    //      console.log(req.headers)


  })

  // ===============
  // LOGOUT
  // ===============
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

  // ===============
  // TOS
  // ===============
  app.get('/tos', function (req, res) {
    res.render('tos.ejs')
  });

  function hasTradeUrl(req, res, next) {
    console.log('tradeurl')
  }

  function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
      users.findOrCreate({
          where: {
            steamid: req.user.steam.id
          }
        })
        .then(function (data) {
          users.update({
            displayname: encodeURI(req.user.steam.displayName),
            photo: req.user.steam.photo
          }, {
            where: {
              steamid: req.user.steam.id
            }
          }).then(function () {
            return next();
          })
        });
    } else {
      res.redirect('/');
    }

    // if they aren't, redirect them to the homepage

  }

  function addToDb(req, res, next) {

    // add user to db
    if (req.isAuthenticated()) {
      users.findOrCreate({
          where: {
            steamid: req.user.steam.id
          }
        })
        .then(function (data) {
          users.update({
            displayname: encodeURI(req.user.steam.displayName),
            photo: req.user.steam.photo
          }, {
            where: {
              steamid: req.user.steam.id
            }
          }).then(function () {
            return next();
          })
        })
      .catch(function(){
        return next();
      });
    }
    else {
     return next()
    }
  }
}
