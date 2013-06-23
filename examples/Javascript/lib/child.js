var util = require('util');
var _ = require('underscore');
var vm = require('vm');
global.require = require;
var serialize = global.serialize || function(obj) {
  return obj.toString();
}
process.on('message', function(code) {
  try {
    result = vm.runInThisContext(code, 'dashboard');
    if (result && _.isFunction(result.toHtml)) {
      return process.send({
        type: 'html',
        value: result.toHtml()
      });
    } else if (result && _.isFunction(result.toWidget)) {
      return process.send({
        type: 'widget',
        value: result.toWidget().toString()
      });
    } else {
      return process.send({
        type: 'result',
        value: util.inspect(result)
      });
    }
  } catch (err) {
    return process.send({
      type: 'error',
      value: err.stack.toString()
    });
  }
});

process.send('ready')