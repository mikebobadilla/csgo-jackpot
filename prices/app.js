fs = require('fs');

var Sequelize = require('sequelize');
var sequelize = new Sequelize('', '', '');

var items = sequelize.define('items', {
  marketname: Sequelize.STRING,
  avg7price: Sequelize.STRING,
  avg30price: Sequelize.STRING,
  currentprice: Sequelize.STRING,
  classid: Sequelize.STRING
});

sequelize.sync()
setTimeout(function () {
  fs.readFile('./files/response.json', function (err, result) {
    if (err) console.log(err)
    var fileItems = JSON.parse(result)
    fileItems.results.forEach(function (item) {
      var sug = (item.suggested_amount_min) ? item.suggested_amount_min.replace(/,/g, '') : null
      items.update({
        currentprice: item.current_price || sug
      }, {where: {
        marketname: encodeURI(item.market_name)
      }})
    })
  })
}, 5000)
