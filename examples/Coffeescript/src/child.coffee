coffee = require('coffee-script')
util = require('util')
vm = require('vm')
_ = require('underscore')
global.require = require
serialize = global.serialize or (obj) => obj.toString() 
process.on 'message', (code) =>
  try
    result = vm.runInThisContext coffee.compile("("+ code + "\n)", {bare: true}), "dashboard"
    split = code.trim().split(/\s+/)
    if (result and _.isFunction(result.toHtml)) 
      process.send({type: 'html', value: result.toHtml()})
    
    else if (result and _.isFunction(result.toWidget)) 
      # This should return a string that can be evaled.
      process.send({type: 'widget', value: result.toWidget().toString()})
    
    else 
      process.send({type: 'result', value: util.inspect(result)})
  catch err
    process.send({type: 'error', value: coffee.helpers.prettyErrorMessage err, "dashboard", code, false})

process.send 'ready'