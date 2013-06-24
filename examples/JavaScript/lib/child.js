var util = require('util');
var _ = require('underscore');
var vm = require('vm');
global.require = require;
var serialize = global.serialize || function(obj) {
  return obj.toString();
}
var outputBuffer = "";
var flush = function() {
  if (outputBuffer.length > 0) process.send({
    type: "text",
    value: outputBuffer
  });
  outputBuffer = "";
}
var outputCatcher = function(chunk, encoding, cb) {
  try {
    outputBuffer += chunk.toString();
    if (cb) cb();
  }
  catch (err) {
    if (cb) cb(err);
  }
}
process.stdout._write = outputCatcher;
process.stderr._write = outputCatcher;

process.on('message', function(code) {
  var reply;
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
        value: err.stack.toString()
      };
    }
    flush();
    process.send(reply);
});

process.send('ready')