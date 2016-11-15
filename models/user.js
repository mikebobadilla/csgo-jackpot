var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

// define the schema
var userSchema = mongoose.Schema({
  steam: {
    id: String,
    photo: String,
    displayName: String,
    tradeId: String,
    id32: String
  }
});

// methods
// generating a hash
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

// checking if password is valid
userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.local.password);
}

// create the model for the users and expose it to our app
module.exports = mongoose.model('User', userSchema);