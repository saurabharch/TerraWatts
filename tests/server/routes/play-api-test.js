// Instantiate all models
var Firebase = require('firebase');
var _ = require('lodash');
var mongoose = require('mongoose');
var Promise = require('bluebird');
mongoose.Promise = Promise;

require('../../../server/db/static-models');
require('../../../server/db/dynamic-models');

var User = mongoose.model('User');
var Grid = mongoose.model('Grid');
var Game = mongoose.model('Game');
var Player = mongoose.model('Player');
var State = mongoose.model('State');
var Plant = mongoose.model('Plant');

var expect = require('chai').expect;

var dbURI = 'mongodb://localhost:27017/grid-test';

var baseRef = new Firebase('https://amber-torch-6713.firebaseio.com/');

var supertest = require('supertest');
var app = require('../../../server/app');

describe('Play Route: ', function () {
	var baseUrl = '/api/play/continue/';

	beforeEach('Establish DB connection', function (done) {
    if (mongoose.connection.db) return done();
		mongoose.connect(dbURI, done);
	});

  after('Clear test database', function (done) {
    Player.remove()
      .then(function () {
        return Game.remove();
      })
      .then(function () {
        return State.remove();
      })
      .then(function () {
        return Grid.remove();
      })
      .then(function () {
        done();
      }).catch(done);
  });

  it('testing if tests test well', function () {
    console.log('Here until another describe is written');
  })

  describe('Game should be set up properly for each number of players: ', function () {
  	var purpleAgent = supertest.agent(app);
  	var yellowAgent = supertest.agent(app);
  	var greenAgent = supertest.agent(app);
  	var blueAgent = supertest.agent(app);
  	var redAgent = supertest.agent(app);
  	var blackAgent = supertest.agent(app);

  	var purpleUser = { username: 'Bush', email: 'bush@gmail.com', password: 'potus' };
  	var yellowUser = { username: 'Clinton', email: 'clinton@gmail.com', password: 'potus' };
  	var greenUser = { username: 'BushSr', email: 'bushsr@gmail.com', password: 'potus' };
  	var blueUser = { username: 'Reagan', email: 'reagan@gmail.com', password: 'potus' };
  	var redUser = { username: 'Carter', email: 'carter@gmail.com', password: 'potus' };
  	var blackUser = { username: 'Ford', email: 'ford@gmail.com', password: 'potus' };

    var firebaseKey;

  	before('Create all users and log them all in', function (done) {
  		function login (superagent, userinfo) {
  			return new Promise(function (resolve, reject) {
  				superagent.post('/login').send(userinfo).end(function (err, res) {
  					if (err) reject(err);
  					else resolve(res.body);
  				});
  			});
  		}

      User.create(purpleUser, yellowUser, greenUser, blueUser, redUser, blackUser)
        .then(function () {
      		return Promise.all([
      			login(purpleAgent, _.omit(purpleUser, 'email')),
      			login(yellowAgent, _.omit(yellowUser, 'email')),
      			login(greenAgent, _.omit(greenUser, 'email')),
      			login(blueAgent, _.omit(blueUser, 'email')),
      			login(redAgent, _.omit(redUser, 'email')),
      			login(blackAgent, _.omit(blackUser, 'email'))
      		]);
        })
        .then(function () {
          done();
        })
        .catch(done);
    });

  	after('Delete all users', function (done) {
  		var usernames = [purpleUser, yellowUser, greenUser, blueUser, redUser, blackUser].map(function (user) {
  			return user.username;
  		});
  		User.remove({ username: { $in: usernames } })
  			.then(function () {
          baseRef.child(firebaseKey).remove();
  				done();
  			}).catch(done);
  	});

  	describe('2 player game', function () {
      var gridId, playersByTurnOrder;
      var agentsByTurnOrder = [];
      var agentsByJoinOrder = [purpleAgent, greenAgent];

      it('should instantiate the game properly', function (done) {
        purpleAgent
          .post('/api/grid')
          .send({
            name: "Game Test",
            map: 'United States',
            maxPlayers: 2,
            makeRandom: true,
            regions: [],
            color: 'purple'
          })
          .expect(201)
          .end(function (err, res) {
            if (err) done(err);
            expect(res.body.name).to.equal("Game Test");
            expect(res.body.state).to.be.a('null');
            expect(res.body.game).to.be.a('null');
            expect(res.body.players.length).to.equal(1);

            gridId = res.body.id;
            firebaseKey = res.body.key;
            done();
          });
      });

      it('should allow another to join', function (done) {
        yellowAgent
          .post('/api/grid/before/' + gridId + '/join')
          .expect(201)
          .end(function (err, res) {
            if (err) done(err);
            done();
          });
      });

      it('should allow it to leave', function (done) {
        yellowAgent
          .post('/api/grid/before/' + gridId + '/leave')
          .expect(201)
          .end(done);
      });

      it('should allow new person to join', function (done) {
        greenAgent
          .post('/api/grid/before/' + gridId + '/join')
          .expect(201)
          .end(done);
      });

      it('should allow it to change color to blue', function (done) {
        User.findOne({ username: greenUser.username })
          .then(function (foundUser) {
            greenAgent
              .put('/api/grid/before/' + gridId + '/color')
              .send({ userId: foundUser._id, color: 'blue' })
              .expect(200)
              .end(done);
          }).catch(done);
      });

      it('should allow it to change color back to green', function (done) {
        User.findOne({ username: greenUser.username })
          .then(function (foundUser) {
            greenAgent
              .put('/api/grid/before/' + gridId + '/color')
              .send({ userId: foundUser._id, color: 'green' })
              .expect(200)
              .end(done);
          }).catch(done);
      });

      it('should start the game with those players', function (done) {
        purpleAgent
          .put('/api/grid/before/' + gridId + '/start')
          .expect(200)
          .end(function (err, res) {
            if (err) done(err);

            return Grid.findById(gridId).populate('players game state')
              .then(function (populatedGrid) {
                populatedGrid.deepPopulate([
                  // 'players.user',
                  // 'players.cities',
                  // 'players.plants',
                  // 'game.cities',
                  // 'game.connections',
                  // 'game.connections.cities',
                  'game.plantMarket',
                  'game.plantDeck',
                  // 'game.discardedPlants',
                  // 'game.stepThreePlants',
                  'game.turnOrder',
                  // 'game.turnOrder.user',
                  'state.auction'
                ], function(error, deepPopulatedGrid) {
                    if(error) done(error);
                    expect(deepPopulatedGrid.availableColors.indexOf('purple')).to.equal(-1)
                    expect(deepPopulatedGrid.availableColors.indexOf('green')).to.equal(-1)
                    expect(deepPopulatedGrid.players.length).to.equal(2);
                    expect(deepPopulatedGrid.game.plantMarket.length).to.equal(8);
                    expect(deepPopulatedGrid.game.plantDeck.length).to.equal(26);
                    expect(deepPopulatedGrid.state.phase).to.equal('plant');
                    expect(deepPopulatedGrid.state.remainingPlayers.length).to.equal(2);
                    expect(deepPopulatedGrid.game.turnOrder[0]._id.equals(deepPopulatedGrid.state.activePlayer)).to.be.true;

                    deepPopulatedGrid.game.turnOrder.forEach(function (player) {
                      agentsByTurnOrder.push(agentsByJoinOrder[player.clockwise]);
                    });
                    playersByTurnOrder = deepPopulatedGrid.game.turnOrder;
                    done();
                });
              }).catch(done);
          });
      });

      it('should validate and proceed game with first player\'s move', function (done) {
        Plant.findOne({ rank: 4 })
          .then(function (plantFour) {
            agentsByTurnOrder[0]
              .post(baseUrl + gridId)
              .send({
                phase: 'plant',
                player: playersByTurnOrder[0],
                data: {
                  plant: plantFour.toObject(),
                  bid: 4
                }
              })
              .expect(201)
              .end(function (err, res) {
                if (err) done(err);

                return Grid.findById(gridId).populate('players game state')
                  .then(function(populatedGrid){
                    populatedGrid.deepPopulate([
                      'players.user',
                      'players.cities',
                      // 'players.plants',
                      // 'game.cities',
                      // 'game.connections',
                      // 'game.connections.cities',
                      // 'game.plantMarket',
                      // 'game.plantDeck',
                      // 'game.discardedPlants',
                      // 'game.stepThreePlants',
                      'game.turnOrder',
                      'game.turnOrder.user',
                      'state.auction'
                    ], function(error, deepPopulatedGrid) {
                        if(error) done(error);
                        expect(!!deepPopulatedGrid.state.auction).to.be.true;
                        expect(deepPopulatedGrid.state.auction.bid).to.equal(4);
                        expect(deepPopulatedGrid.state.auction.remainingPlayers.length).to.equal(2);
                        expect(deepPopulatedGrid.state.auction.highestBidder.equals(playersByTurnOrder[0]._id)).to.be.true;

                        var highestBidderId = deepPopulatedGrid.state.auction.highestBidder;
                        var highestBidderIdx = _.findIndex(deepPopulatedGrid.players, player => player._id.equals(highestBidderId));
                        var nextPlayerIndex = (highestBidderIdx + 1) % 2;
                        expect(deepPopulatedGrid.state.auction.activePlayer.equals(deepPopulatedGrid.players[nextPlayerIndex]._id)).to.be.true;

                        done();
                    })
                  }).catch(done);
              });
          });
      });

      it('should validate and proceed game with second player\'s move', function (done) {
        Plant.findOne({ rank: 4 })
          .then(function (plantFour) {
            agentsByTurnOrder[1]
              .post(baseUrl + gridId)
              .send({
                phase: 'plant',
                player: playersByTurnOrder[1],
                data: {
                  plant: plantFour.toObject(),
                  bid: 6
                }
              })
              .expect(201)
              .end(function (err, res) {
                if (err) done(err);

                return Grid.findById(gridId).populate('players game state')
                  .then(function(populatedGrid){
                    populatedGrid.deepPopulate([
                      'players.user',
                      'players.cities',
                      // 'players.plants',
                      // 'game.cities',
                      // 'game.connections',
                      // 'game.connections.cities',
                      // 'game.plantMarket',
                      // 'game.plantDeck',
                      // 'game.discardedPlants',
                      // 'game.stepThreePlants',
                      'game.turnOrder',
                      'game.turnOrder.user',
                      'state.auction'
                    ], function(error, deepPopulatedGrid) {
                        if(error) done(error);
                        expect(!!deepPopulatedGrid.state.auction).to.be.true;
                        expect(deepPopulatedGrid.state.auction.bid).to.equal(6);
                        expect(deepPopulatedGrid.state.auction.remainingPlayers.length).to.equal(2);
                        expect(deepPopulatedGrid.state.auction.highestBidder.equals(playersByTurnOrder[1]._id)).to.be.true;

                        var highestBidderId = deepPopulatedGrid.state.auction.highestBidder;
                        var highestBidderIdx = _.findIndex(deepPopulatedGrid.players, player => player._id.equals(highestBidderId));
                        var nextPlayerIndex = (highestBidderIdx + 1) % 2;
                        expect(deepPopulatedGrid.state.auction.activePlayer.equals(deepPopulatedGrid.players[nextPlayerIndex]._id)).to.be.true;
                        done();
                    })
                  }).catch(done);
              });
          });

      });

      it('should validate and proceed game with first player\'s decision to pass', function (done) {
        Plant.findOne({ rank: 4 })
          .then(function (plantFour) {
            agentsByTurnOrder[0]
              .post(baseUrl + gridId)
              .send({
                phase: 'plant',
                player: playersByTurnOrder[0],
                data: 'pass'
              })
              .expect(201)
              .end(function (err, res) {
                if (err) done(err);

                return Grid.findById(gridId).populate('players game state')
                  .then(function(populatedGrid){
                    populatedGrid.deepPopulate([
                      // 'players.user',
                      // 'players.cities',
                      'players.plants',
                      // 'game.cities',
                      // 'game.connections',
                      // 'game.connections.cities',
                      'game.plantMarket',
                      'game.plantDeck',
                      // 'game.discardedPlants',
                      // 'game.stepThreePlants',
                      'game.turnOrder',
                      'game.turnOrder.user',
                      'state.auction'
                    ], function(error, deepPopulatedGrid) {
                        if(error) done(error);

                        expect(deepPopulatedGrid.game.plantMarket.length).to.equal(8);
                        expect(_.findIndex(deepPopulatedGrid.game.plantMarket, plant => plant.rank === 4)).to.equal(-1);
                        expect(deepPopulatedGrid.game.plantMarket.every(function (plant, idx, arr) {
                          if(idx === 0) return true;
                          return plant.rank > arr[idx - 1].rank;
                        })).to.be.true;

                        var greenIdx = _.findIndex(deepPopulatedGrid.players, player => player._id.equals(playersByTurnOrder[1]._id));
                        expect(deepPopulatedGrid.players[greenIdx].money).to.equal(44);
                        expect(deepPopulatedGrid.players[greenIdx].plants[0].rank).to.equal(4);

                        expect(deepPopulatedGrid.state.activePlayer.equals(playersByTurnOrder[0]._id)).to.equal.true;
                        expect(deepPopulatedGrid.state.remainingPlayers).to.not.include(playersByTurnOrder[1]._id);

                        done();
                    })
                  }).catch(done);
              });
          });
      });

      it('should validate and proceed game with first player\'s decision to take plant 5', function (done) {
        Plant.findOne({ rank: 5 })
          .then(function (plantFive) {
            agentsByTurnOrder[0]
              .post(baseUrl + gridId)
              .send({
                phase: 'plant',
                player: playersByTurnOrder[0],
                data: {
                  plant: plantFive.toObject(),
                  bid: 5
                }
              })
              .expect(201)
              .end(function (err, res) {
                if (err) done(err);

                Grid.findById(gridId).populate('players game state')
                  .then(function(populatedGrid){
                    populatedGrid.deepPopulate([
                      // 'players.user',
                      // 'players.cities',
                      'players.plants',
                      // 'game.cities',
                      // 'game.connections',
                      // 'game.connections.cities',
                      'game.plantMarket',
                      'game.plantDeck',
                      // 'game.discardedPlants',
                      // 'game.stepThreePlants',
                      'game.turnOrder',
                      'game.turnOrder.user',
                      'state.auction'
                    ], function(error, deepPopulatedGrid) {
                        if(error) done(error);

                        expect(deepPopulatedGrid.game.plantMarket.length).to.equal(8);
                        expect(_.findIndex(deepPopulatedGrid.game.plantMarket, plant => plant.rank === 5)).to.equal(-1);
                        expect(deepPopulatedGrid.game.plantMarket.every(function (plant, idx, arr) {
                          if(idx === 0) return true;
                          return plant.rank > arr[idx - 1].rank;
                        })).to.be.true;

                        var purpleIdx = _.findIndex(deepPopulatedGrid.players, player => player._id.equals(playersByTurnOrder[0]._id));
                        expect(deepPopulatedGrid.players[purpleIdx].money).to.equal(45);
                        expect(deepPopulatedGrid.players[purpleIdx].plants[0].rank).to.equal(5);

                        expect(deepPopulatedGrid.state.phase).to.equal('resource');
                        expect(deepPopulatedGrid.state.remainingPlayers.length).to.equal(2);
                        expect(deepPopulatedGrid.game.turnOrder[0]._id.equals(playersByTurnOrder[1]._id)).to.be.true;
                        expect(deepPopulatedGrid.game.turnOrder[1]._id.equals(playersByTurnOrder[0]._id)).to.be.true;

                        done();
                    })
                  }).catch(done);
              });
          });
      });


  	});

  });


});