coffee = require('coffee-script')
util = require('util')
_ = require('underscore')

process.on 'message', (code) =>
  try
    result = coffee.eval("("+ code + "\n)", {
      filename: 'dashboard',
      modulename: 'dashboard'
    })
    split = code.trim().split(/\s+/)
    if (result and _.isFunction(result.toHtml)) 
      process.send({type: 'html', value: result.toHtml()})
    
    else if (result and _.isFunction(result.toWidget)) 
      # This should return a string that can be evaled.
      process.send({type: 'widget', value: result.toWidget()})
    
    else 
      process.send({type: 'result', value: util.inspect(result)})
  catch err
    process.send({type: 'error', value: err.stack.toString()})

process.send 'ready'