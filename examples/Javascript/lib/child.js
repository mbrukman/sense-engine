var util = require('util');
var _ = require('underscore');
var vm = require('vm');

process.on('message', function(code) {
  var result, split;
  try {
    result = vm.runInThisContext(code, 'dashboard');
    split = code.trim().split(/\s+/);
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