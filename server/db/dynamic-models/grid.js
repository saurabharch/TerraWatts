var _ = require('lodash');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var firebaseHelper = require('../../firebase');

var Region = mongoose.model('Region');
var Player = mongoose.model('Player');
var Game = mongoose.model('Game');

var schema = new mongoose.Schema({
  // Below are game ENVIRONMENT settings
  key: {
    type: String
  },
  name: {
    type: String,
    unique: true,
    required: true
  },
  map: {
    type: String,
    enum: ['United States', 'Germany', 'China', 'South Korea']
  },
  regions: {
    type: [Number]
  },
  maxPlayers: {
    type: Number,
    enum: [2, 3, 4, 5, 6]
  },
  availableColors: {
    type: [String],
    default: ['purple', 'yellow', 'green', 'blue', 'red', 'black']
  },
  // Below are references to each COMPONENT of the game environment
  players: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
  }],
  game: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
  },
  state: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
  },
  // Below are HISTORICAL data relevant to this game environment
  complete: {
      type: Boolean,
      default: false
  },
  history: {
      type: []
  },
});

// Only needed when there are virtuals
// schema.set('toObject', { virtuals: true });
// schema.set('toJSON', { virtuals: true });

schema.pre('save', function (next) {
  
  /* 
      Pushes grid (minus grid history) into grid.
  */
  
  // var gridSnapshot = _.omit(this.toObject(), ['history']);
  if(this.game) this.history.push(this.game.toObject());
  
  /* 
      finds connection within connections hash
      then updates firebase game object.
  */
  
  firebaseHelper
    .getConnectionToGame(this.key) // ==> get connection to game
    .set(this.game.toObject());

  next();
});

schema.methods.makeRandomRegions = function (numPlayers) {
  var self = this;
  Region.makeRandom(this.map, numPlayers)
    .then(function (selectedRegions) {
      self.regions = selectedRegions;
      return self.save();
    });
};

schema.methods.addPlayer = function (newPlayer) {

  if (this.game) throw new Error('The Game is already in play');

  if (this.players.length >= 6) throw new Error('The Game is already full');

  if (this.players.some(player => player.user._id.equals(newPlayer.user._id))) return Promise.resolve(this);

	this.players.push(newPlayer);
	return this.save();
};

schema.methods.removePlayer = function (userId) {
  Player.findOne({ user: userId })
	var userIndex = this.players.indexOf(userId);
	this.players.splice(userIndex,1);
	return this.save();
};

schema.methods.createGame = function () {
  var self = this;

  return Game.init(this.map, this.players, this.regions)
    .then(function (newGame) {
      self.game = newGame;
      return self.save();
    });
};

mongoose.model('Grid', schema);