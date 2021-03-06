var router = require('express').Router();
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var firebaseHelper = require("../../../firebase");

var fbRef = firebaseHelper.base();

var Grid = mongoose.model('Grid');
var Player = mongoose.model('Player');

// Current URL: 'api/grid'

router.get('/tour', function(req, res, next) {
  Grid.getTourGrid()
  .then(function(grid) {
    res.json(grid);
  });
})

router.post('/', function (req, res, next) {
	Grid.create({
      name: req.body.name,
      map: req.body.map,
      maxPlayers: req.body.numPlayers,
      randomRegions: req.body.makeRandom
    })
    .then(function (grid) {
      grid.key = fbRef.push(grid.toObject()).key();
      fbRef.child(grid.key).update({ "key": grid.key });
      return grid.save();
    })
    .then(function (createdGrid) {
      return Player.create({ user: req.user, color: req.body.color, clockwise: 0 })
        .then(function (newPlayer) {
          return createdGrid.addPlayer(newPlayer);
        });
    })
    .then(function (grid) {
      return Grid.findById(grid._id)
          .populate('players');
    })
    .then(function(grid){
        res.status(201).json(grid);
    })
    .catch(next);
});

router.param('gridId', function(req, res, next, gridId){
  Grid.findById(gridId)
    .populate('players game state')
    .then(function (grid) {
      req.grid = grid;
      next();
    })
    .catch(next);
});

router.use('/before/:gridId', require('./before'));

router.use('/after/:gridId', require('./after'));

module.exports = router;
