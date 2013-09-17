// Example echo engine for Sense.

exports.createEngine = function() {
  var engine = require('sense-engine')();

  // The echo engine's autocomplete function can't really do anything
  // useful, so we just give back the input as the sole completion.
  engine.complete = function(substr, cb) {
    cb([substr]);
  };

  // This interrupt function just prints a message and then exits.
  engine.interrupt = function() {
    engine.text('Interrupt received.');
    engine.exit(1);
  };

  // This function is responsible for sending code to the echoing the code,
  // then notifying the engine that the next command can be sent in.
  engine.execute = function(code, next) {
    engine.code(code, 'text/plain');
    engine.text(code);
    next();
  };

  // This extremely simple chunker just splits into words.
  engine.chunk = function(code, cb) {
    cb(code.split(' '));
  };

  // Call engine ready when the engine is ready to go.
  engine.ready();
  return engine;
};
