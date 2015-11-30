var mongoose = require('mongoose');
var Promise = require('bluebird');
var User = Promise.promisifyAll(mongoose.model('User'));

var seedUsers = function () {

  var users = [
    {
      username: 'tester',
      email: 'testing@fsa.com',
      password: 'password'
    },
    {
      username: 'MrPresident',
      email: 'obama@gmail.com',
      password: 'potus'
    },
    {
      username: 'mikeike',
      email: 'mike@mike.com',
      password: 'password'
    }
  ];

  return User.createAsync(users);

};

module.exports = seedUsers;