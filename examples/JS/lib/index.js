var cp = require('child_process');
var path = require('path');
var _ = require('underscore');
var marked = require('marked');

chunkBlockComments = function(code) {
  var chunks, comment, split, splits, _i, _len;
  splits = code.split(/(\/\*|\*\/)/);
  chunks = [];
  comment = false;
  for (_i = 0, _len = splits.length; _i < _len; _i++) {
    split = splits[_i];
    if (split === '/*') {
      comment = true;
    } else if (comment) {
      if (split == '*/') {
        comment = false;
      }
      else {
        chunks.push(['blockComment', split]);
      }
    } else {
      chunks.push(['unknown', split]);
    }
  }
  return chunks;
};

chunkLineComments = function(code) {
  var chunks, comment, curChunk, line, lines, trLine, _i, _len;
  lines = code.split('\n');
  chunks = [];
  curChunk = "";
  comment = false;
  for (_i = 0, _len = lines.length; _i < _len; _i++) {
    line = lines[_i];
    trLine = line.trim();
    if (trLine.slice(0,2) === '//') {
      if (comment) {
        curChunk += '\n' + line;
      } else {
        if (curChunk.length > 0) {
          chunks.push(['code', curChunk.trim()]);
        }
        curChunk = line;
        comment = true;
      }
    } else {
      if (comment) {
        if (curChunk.length > 0) {
          chunks.push(['comment', curChunk]);
        }
        curChunk = line;
        comment = false;
      } else {
        curChunk += '\n' + line;
      }
    }
  }
  if (curChunk.length > 0) {
    if (comment) {
      chunks.push(['comment', curChunk]);
    } else {
      chunks.push(['code', curChunk.trim()]);
    }
  }
  return chunks;
};


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

  // A very simple autocomplete function that just matches against
  // the globals.
  dashboard.complete = function(substr) {
    var names,
      _this = this;
    names = Object.getOwnPropertyNames(global);
    return _.filter(names, function(x) {
      return x.indexOf(substr) === 0;
    });
  };

  // This interrupt function just sends the SIGINT signal to the worker
  // process, but many other behaviors are possible.
  dashboard.interrupt = function() {
    return dashboard.worker.kill('SIGINT');
  };

  // This function is responsible for sending code to the worker process
  // for execution, returning any results to the dashboard, and notifying
  // the dashboard when the computation has stopped and the next command
  // can be sent in.
  dashboard.execute = function(code, next) {
    if (code[0] === 'comment') {
      // If the code is a comment, we report it to the dashboard without
      // communicating with the child process at all.
      dashboard.comment(code[1]);
      // The dashboard is now ready to take the next code chunk.
      next();
    } 
    else if (code[0] == 'blockComment') {
      // If the code is a block comment, we assume that it's Markdown
      // documentation and pass it to the dashboard as such.
      dashboard.markdown(marked(code[1]));
      next();
    }
    else {
      code = code[1];
      dashboard.code(code, 'javascript');
      dashboard.worker.send(code);
      // The next message we get from the dashboard will be the result of 
      // executing the code.
      return dashboard.worker.once('message', function(m) {
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

  // A very simple chunker that splits code up into comments and actual code.
  // It doesn't split the code up into statements, which would make for nicer
  // looking dashboards.
  dashboard.chunk = function(code) {
    var chunk, chunks, newChunks, _i, _len;
    chunks = chunkBlockComments(code);
    newChunks = [];
    for (_i = 0, _len = chunks.length; _i < _len; _i++) {
      chunk = chunks[_i];
      if (chunk[0] === 'unknown') {
        newChunks.push.apply(newChunks, chunkLineComments(chunk[1]));
      } else {
        newChunks.push(chunk);
      }
    }
    return newChunks;
  };
  return dashboard.ready();
};
