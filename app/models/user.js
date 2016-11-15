var mongoose = require('mongoose');

// define the schema
var userSchema = mongoose.Schema({
  steam: {
    id: String,
    photo: String,
    displayName: String,
    tradeurl: String
  }
});

// create the model for the users and expose it to our app
module.exports = mongoose.model('User', userSchema);