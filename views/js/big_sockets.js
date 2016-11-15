var socket = io('/regs');

    socket.on('messages', function (data) {
      console.log("What up");
    });

    socket.on('big_clean', function (data) {
      $winnerClone = $('.winner').clone().removeClass('winner')
      $roundInfoClone = $('.roundInfo').clone().removeClass('roundInfo')
      $cbSmallClone = $('#currentBetsSmall').clone().removeAttr('id')
      var $previousRound = $('.previousRound')
      $previousRound.html('')
      $previousRound.append($cbSmallClone)
      $previousRound.prepend($roundInfoClone)
      $previousRound.prepend($winnerClone)
      $("#currentPotItems > ul").empty();
      $("#currentBetsSmall > ul").empty();
      $('.pot-total > h2').html("$0.00")
      $('.user-percentage > h2').html("0.00%")
      $('.winner').remove()
      changeWheel(-1)
    });


    function addItem(classIds){
      var listItems = '';
      var testing = classIds.sort(function (a, b) {
        return b.value - a.value
      })

      for (var i in classIds) {
        listItems += "<li class=\"player-card\"><img src=\"http://steamcommunity-a.akamaihd.net/economy/image/class/730/" + classIds[i].classid + "/80fx80f\"></li>"
      }
      $("#currentPotItems > ul")
        .html(listItems)
    }

    function addPlayer(players){
      var listItems = ''
      if (players) {
        for (var i in players) {
//          $("#currentBetsSmall > ul")
            listItems += "<li class=\"collection-item avatar\"><img class=\"circle\" src=\"" + players[i].photo + "\" alt=\"\"><span class=\"title\">" + players[i].name + "</span><p>Deposited " + players[i].numberOfItems + " skins (valued at $" + players[i].value.toFixed(2) + ")</p></li>"
        }
        $("#currentBetsSmall > ul").html(listItems)
      }
    }

    function addTotal(total){
      $('.pot-total > h2').html("$" + (total / 100).toFixed(2))
    }

    function changeWheel(n) {
      $('.dial').each(function () {

           var $this = $(this);
           $this.dial({
           });
           $({
               value: parseInt($('.dial').val().split('/')[0])
           }).animate({
               value: n
           }, {
               duration: 1000,
               easing: 'swing',
               step: function () {
                   $this.val(Math.ceil(this.value) + "/50").trigger('change');
               }
           })

       });
    }

    
    socket.on('big_adjustFront', function(data){
      addItem(data.classids);
      addPlayer(data.players);
      addTotal(data.tickets);
      changeWheel(data.numberOfItems);
    })

    socket.on('big_userTickets', function (data) {
      $('.user-percentage > h2').html((data * 100).toFixed(2) + "%")
    })

    socket.on('big_roundInfo', function (data) {
      $('.roundInfo').html("<li class=\"collection-header\"><span><b>Round # </b>" + data.roundid + " </span><span><b>Round Hash:</b> " + data.hash + "</span> <span class=\"winner-info\"></span></li>")
    })

    socket.on('big_winnerInfo', function (data) {
      $('#currentRound').prepend("<div class=\"card-panel white center-align winner\"><span>" + data.name + " won $ " + (data.amount / 100).toFixed(2) + " with a " + (data.percentage  * 100).toFixed(2) + "% chance!</span></div>").show()
      $('.winner-info').html("<span><b>Salt: </b>" + data.salt + "</span><span><b>Winning Percentage: </b>" + data.winningPercentage + "%")
    })
    