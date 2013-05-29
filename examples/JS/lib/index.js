var cp = require('child_process');
var path = require('path');
var _ = require('underscore');

module.exports = function(dashboard) {
  dashboard.worker = cp.fork(path.join(__dirname, 'child'), [], {
    silent: true
  });
  dashboard.worker.stdout.on('data', function(data) {
    return dashboard.text(data);
  });
  dashboard.worker.stderr.on('data', function(data) {
    return dashboard.text(data);
  });
  dashboard.complete = function(substr) {
    var names,
      _this = this;
    names = Object.getOwnPropertyNames(global);
    return _.filter(names, function(x) {
      return x.indexOf(substr) === 0;
    });
  };
  dashboard.interrupt = function() {
    return dashboard.worker.kill('SIGINT');
  };
  dashboard.execute = function(code, next) {
    if (code[0] === 'comment') {
      dashboard.comment(code[1]);
      dashboard.ready();
      next();
    } else {
      code = code[1];
      dashboard.code(code, 'javascript');
      dashboard.worker.send(code);
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
        dashboard.ready();
        next();
      });
    }
  };
  dashboard.chunk = function(code) {
    return [['code', code]];
    // var buffer, chunks, inBlockComment, lastWasComment, line, lines, trLine, _i, _len;
    // chunks = [];
    // buffer = "";
    // lines = code.split("\n");
    // inBlockComment = false;
    // lastWasComment = false;
    // for (_i = 0, _len = lines.length; _i < _len; _i++) {
    //   line = lines[_i];
    //   trLine = line.trim();
    //   if (trLine.slice(0, 3) === "###") {
    //     if (inBlockComment) {
    //       buffer += line;
    //       chunks.push(['comment', buffer.trim()]);
    //       buffer = "";
    //       inBlockComment = false;
    //     } else {
    //       if (buffer.trim() !== "") {
    //         if (lastWasComment) {
    //           chunks.push(['comment', buffer.trim()]);
    //         } else {
    //           chunks.push(['code', buffer.trim()]);
    //         }
    //         buffer = "";
    //       }
    //       buffer += line + "\n";
    //       inBlockComment = true;
    //     }
    //   } else if (line[0] === "#" && !inBlockComment) {
    //     if (!lastWasComment && buffer.trim() !== "") {
    //       chunks.push(['code', buffer.trim()]);
    //       buffer = "";
    //     }
    //     buffer += line + "\n";
    //     lastWasComment = true;
    //   } else {
    //     if (inBlockComment) {
    //       buffer += line + "\n";
    //       continue;
    //     } else if (lastWasComment) {
    //       chunks.push(['comment', buffer.trim()]);
    //       buffer = "";
    //       lastWasComment = false;
    //     }
    //     if (line.trim().length === 0 || line[0] === " " || (line.slice(0, 4) === "else" && line.trim().length === 4) || line.slice(0, 4) === "else ") {
    //       buffer += line + "\n";
    //     } else {
    //       if (buffer.trim() !== "") {
    //         chunks.push(['code', buffer.trim()]);
    //         buffer = "";
    //       }
    //       buffer = line + "\n";
    //     }
    //   }
    // }
    // if (buffer) {
    //   if (lastWasComment) {
    //     chunks.push(['comment', buffer.trim()]);
    //   } else if (inBlockComment) {
    //     chunks.push(['comment', buffer.trim()]);
    //   } else if (buffer.trim() !== "") {
    //     chunks.push(['code', buffer.trim()]);
    //   }
    // }
    // return chunks;
  };
  return dashboard.ready();
};
