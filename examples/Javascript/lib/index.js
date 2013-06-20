// TODO: Capture assignments.

var cp = require('child_process');
var path = require('path');
var _ = require('underscore');
var marked = require('marked');
var acorn = require('acorn');
var cch = require('comment-chunk-helper');

var repeat = function(s, n) {
  var out = ""
  for (var i = 0; i < n; i++) out += s;
  return out;
}

var formatError = function(code, e) {
  msg = [
    "dashboard:" + e.loc.line + ":" + e.loc.column + ": " + e.message.replace(/\(\d+:\d+\)$/, ""),
    code.split("\n")[e.loc.line-1],
    repeat(" ", e.loc.column) + "^"
  ]
  return msg.join("\n");
}

var getStatLocs = function(ast) {
  var statLocs = [];
  for (var i=0; i<ast.body.length;i++) {
    var stat = ast.body[i];
    statLocs.push({
      start: {
        line: stat.loc.start.line-1,    // acorn indexes lines starting at 1
        column: stat.loc.start.column   // but columns starting at 0
      },
      end: {
        line: stat.loc.end.line-1,         
        column: stat.loc.end.column - 1 // acorn's upper bound is exclusive
      }
    });
  }
  return statLocs;
}

var parse = function(code, cb) {
  try {
    var ast = acorn.parse(code, {locations: true});
    cb(false, getStatLocs(ast))
  }
  catch (e) {
    // We should be able to simply pass the code on and let the engine in
    // child.js deal with presenting the syntax error, but unfortunately
    // that won't work until https://github.com/joyent/node/issues/3452
    // is fixed. For now, we manually format the syntax error. This will
    // be sent right to the dashboard.
    cb(formatError(code,e));
  }
};

var chunk = cch({
  parser: parse,
  lineComment: "//",
  blockComment: {
    left: "/*",
    right: "*/"
  }
});

exports.createDashboard = function(dashboard) {
  worker = cp.fork(path.join(__dirname, 'child'), [], {
    silent: true
  });

  // We report that the dashboard is ready to start taking input.
  var readyListener;
  worker.once('message', readyListener = function(m) {
    if (m == 'ready') {
      dashboard.ready();
    }
    else {
      worker.once('message', readyListener);
    }
  });

  worker.on('exit', process.exit);


  // We capture all output of the dashboard and report it as text. Note
  // that this will catch calls to console.log and such, not the results
  // of expressions that we evaluate.
  worker.stdout.on('data', function(data) {
    return dashboard.text(data);
  });
  worker.stderr.on('data', function(data) {
    return dashboard.text(data);
  });

  dashboard.chunk = chunk;

  // A very simple autocomplete function that just matches against
  // the globals.
  dashboard.complete = function(substr, cb) {
    var names,
      _this = this;
    names = Object.getOwnPropertyNames(global);
    cb(_.filter(names, function(x) {
      return x.indexOf(substr) === 0;
    }));
  };

  // This interrupt function just sends the SIGINT signal to the worker
  // process, but many other behaviors are possible.
  dashboard.interrupt = function() {
    return worker.kill('SIGINT');
  };

  // This function is responsible for sending code to the worker process
  // for execution, returning any results to the dashboard, and notifying
  // the dashboard when the computation has stopped and the next command
  // can be sent in.
  dashboard.execute = function(chunk, next) {
    if (chunk.type === 'comment') {
      // If the chunk is a comment, we report it to the dashboard without
      // communicating with the child process at all.
      dashboard.comment(chunk.value);
      // The dashboard is now ready to take the next chunk.
      next();
    } 
    else if (chunk.type === 'blockComment') {
      // If the chunk is a block comment, we assume that it's Markdown
      // documentation and pass it to the dashboard as such.
      dashboard.markdown(marked(chunk.value));
      next();
    }
    else if (chunk.type === 'error') {
      // If the chunk is a syntax error, we pass it right to the dashboard.
      dashboard.error(chunk.value);
      next();
    }
    else {
      var code = chunk.value;
      dashboard.code(code, 'javascript');
      worker.send(code);
      // The next message we get from the dashboard will be the result of 
      // executing the code.
      return worker.once('message', function(m) {
        switch (m.type) {
          case 'result':
            if (m.value !== 'undefined') {
              dashboard.text(m.value);
            }
            break;
          case 'error':
            dashboard.error(m.value);
            break;
          case 'widget':
            dashboard.widget(m.value);
            break;
          case 'html':
            dashboard.html(m.value);
        }
        // Whether the code returned a result or caused an error, the dashboard
        // is now ready to take the next code chunk.
        next();
      });
    }
  };

};
