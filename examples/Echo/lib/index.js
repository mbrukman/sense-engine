var cp = require('child_process');
var path = require('path');

module.exports = function(dashboard) {
  dashboard.worker = cp.fork(path.join(__dirname, 'child'), [], {
    silent: true
  });

  // We capture all output of the dashboard and report it as text. Note
  // that this will catch calls to console.log and such, not the results
  // of expressions that we evaluate.
  dashboard.worker.stdout.on('data', function(data) {
    return dashboard.text(data);
  });
  dashboard.worker.stderr.on('data', function(data) {
    return dashboard.text(data);
  });

  // The echo dashboard's autocomplete function can't really do anything
  // useful, so we just give back the input as the sole completion.
  dashboard.complete = function(substr) {
    return [substr];
  };

  // This interrupt function just sends the SIGINT signal to the worker
  // process, but many other behaviors are possible.
  dashboard.interrupt = function() {
    console.log('Interrupt received.')
    return dashboard.worker.kill('SIGINT');
  };

  // This function is responsible for sending code to the worker process
  // for execution, returning any results to the dashboard, and notifying
  // the dashboard when the computation has stopped and the next command
  // can be sent in.
  dashboard.execute = function(code, next) {
    dashboard.code(code, 'text');
    dashboard.worker.send(code);
    // The next message we get from the dashboard will be the result of 
    // code, echoed back.
    return dashboard.worker.once('message', function(m) {
      dashboard.text(m);
      // The dashboard is now ready for the next code chunk.
      next();
    });
  };

  // This extremely simple chunker just splits the input up into lines.
  dashboard.chunk = function(code) {
    return code.split('\n');
  };
  dashboard.ready();
};
