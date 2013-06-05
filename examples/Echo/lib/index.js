var cp = require('child_process');
var path = require('path');

exports.createDashboard = function(dashboard) {

  // The echo dashboard's autocomplete function can't really do anything
  // useful, so we just give back the input as the sole completion.
  dashboard.complete = function(substr, cb) {
    cb([substr]);
  };

  // This interrupt function just prints a message and then exits.
  dashboard.interrupt = function() {
    console.log('Interrupt received.')
    process.exit();
  };

  // This function is responsible for sending code to the echoing the code,
  // then notifying the dashboard that the next command can be sent in.
  dashboard.execute = function(code, next) {
    dashboard.code(code, 'text');
    dashboard.text(code);
    next();
  };

  // This extremely simple chunker just splits the input up into lines.
  dashboard.chunk = function(code, cb) {
    cb(code.split('\n'));
  };

  dashboard.ready();
};
