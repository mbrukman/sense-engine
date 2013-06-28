var util = require('util');
var _ = require('underscore');
var vm = require('vm');
var cp = require('child_process');
global.require = require;

// Add utilities to the globals.
global.sense = {
  install: function(pkg) {
    proc = cp.spawn("npm", ["install", pkg]);
    proc.stdout.on("data", function(dat) {
      console.log(dat.toString());
    });
    proc.stderr.on("data", function(dat) {
      console.log(dat.toString());
    });
  },
  html: function(htmlCode) {
    process.send({type: 'html', value: htmlCode});
  },
  widget: function(javascriptCode){
    process.send({type: 'widget', value: javascriptCode});
  }
};
var serialize = global.serialize || function(obj) {
  return obj.toString();
};
var outputCatcher = function(chunk, encoding, cb) {
  try {
    process.send({type: "text", value: chunk.toString()});
    if (cb) cb();
  }
  catch (err) {
    if (cb) cb(err);
  }
};
process.stdout._write = outputCatcher;
process.stderr._write = outputCatcher;

process.on('message', function(code) {
  var reply, result;
  try {
    result = vm.runInThisContext(code, 'dashboard');
      if (result && _.isFunction(result.toHtml)) {
        reply = {
          type: 'html',
          value: result.toHtml()
        };
      } else if (result && _.isFunction(result.toWidget)) {
        reply = {
          type: 'widget',
          value: serialize(result.toWidget())
        };
      } else {
        reply = {
          type: 'result',
          value: util.inspect(result)
        };
      }
    } catch (err) {
      reply = {
        type: 'error',
        value: {
          message: err.name + ": " + err.message, 
          details: err.stack.toString().split('\n').slice(1).join('\n')
        }
      };
    }
    process.send(reply);
});

process.send('ready');