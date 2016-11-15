// config/auth.js

// expose our config diectly to our application using module.exports
module.exports = {
	'steamAuth' : {
		'callbackURL'		: 'http://<Your URL>/auth/steam/callback',
		'apiKey'			: '',
		'realm'				: 'http://<Your URL>.com/'
	},
  'sql' : {
    'db' : '',
    'username': '',
    'password': ''
  }
};
