var cp = require('child_process');
var path = require('path');
var _ = require('underscore');

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
      // communicating with the child process at all. If the comments were
      // known to be in markdown format, the comment character '#' could be
      // stripped and the comment text could be passed to dashboard.markdown.
      dashboard.comment(code[1]);
      // The dashboard is now ready to take the next code chunk.
      dashboard.ready();
      next();
    } else {
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
        dashboard.ready();
        next();
      });
    }
  };

  // A very simple chunker that splits code up into comments and actual code.
  // It doesn't split the code up into statements, which would make for nicer
  // looking dashboards.
  dashboard.chunk = function(code) {
    return [['code', code]];
    var buffer, chunks, inBlockComment, lastWasComment, line, lines, trLine, _i, _len;
    chunks = [];
    buffer = "";
    lines = code.split("\n");
    inBlockComment = false;
    lastWasComment = false;
    for (_i = 0, _len = lines.length; _i < _len; _i++) {
      line = lines[_i];
      trLine = line.trim();
      if (trLine.slice(0, 3) === "*/") {
        buffer += line;        
        if (inBlockComment) {
          chunks.push(['comment', buffer.trim()]);
          buffer = "";
          inBlockComment = false;
        }
      }
      else {
        if (buffer.trim() !== "") {
          if (lastWasComment) {
            chunks.push(['comment', buffer.trim()]);
          } else {
            chunks.push(['code', buffer.trim()]);
          }
          buffer = "";
        }
        buffer += line + "\n";
        inBlockComment = true;
      }
      } else if (line[0] === "#" && !inBlockComment) {
        if (!lastWasComment && buffer.trim() !== "") {
          chunks.push(['code', buffer.trim()]);
          buffer = "";
        }
        buffer += line + "\n";
        lastWasComment = true;
      } else {
        if (inBlockComment) {
          buffer += line + "\n";
          continue;
        } else if (lastWasComment) {
          chunks.push(['comment', buffer.trim()]);
          buffer = "";
          lastWasComment = false;
        }
        if (line.trim().length === 0 || line[0] === " " || (line.slice(0, 4) === "else" && line.trim().length === 4) || line.slice(0, 4) === "else ") {
          buffer += line + "\n";
        } else {
          if (buffer.trim() !== "") {
            chunks.push(['code', buffer.trim()]);
            buffer = "";
          }
          buffer = line + "\n";
        }
      }
    }
    if (buffer) {
      if (lastWasComment) {
        chunks.push(['comment', buffer.trim()]);
      } else if (inBlockComment) {
        chunks.push(['comment', buffer.trim()]);
      } else if (buffer.trim() !== "") {
        chunks.push(['code', buffer.trim()]);
      }
    }
    return chunks;
  };
  return dashboard.ready();
};
