var router = require('express').Router();
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// Current URL: 'api/play'

var Grid = mongoose.model('Grid');

router.param('gridId', function(req, res, next, gridId){
  Grid.findById(gridId)
    .populate('players game state')
    .then(function (grid) {
      req.grid = grid;
      next();
    })
    .catch(next);
});

router.use('/plant/:gridId', require('./1_plant_phase'));

router.use('/resource/:gridId', require('./2_resource_phase'));

router.use('/city/:gridId', require('./3_city_phase'));

router.use('/bureaucracy/:gridId', require('./4_bureaucracy_phase'));

module.exports = router;