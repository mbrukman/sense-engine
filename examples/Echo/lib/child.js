var util = require('util');
var _ = require('underscore');
var vm = require('vm');

process.on('message', function(code) {
  process.send(code);
});
