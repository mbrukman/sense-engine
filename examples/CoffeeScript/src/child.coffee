coffee = require('coffee-script')
util = require('util')
vm = require('vm')
_ = require('underscore')
global.require = require
serialize = global.serialize or (obj) => obj.toString() 

outputBuffer = "";
flush = =>
  if outputBuffer.length > 0 
    process.send {
      type: "text",
      value: outputBuffer
    }
  outputBuffer = ""
outputCatcher = (chunk, encoding, cb) =>
  try
    outputBuffer += chunk.toString()
    if cb then cb()
  catch err
    if (cb) then cb(err)

process.stdout._write = outputCatcher;
process.stderr._write = outputCatcher;

process.on 'message', (code) =>
  try
    result = vm.runInThisContext coffee.compile("("+ code + "\n)", {bare: true}), "dashboard"
    split = code.trim().split(/\s+/)
    if (result and _.isFunction(result.toHtml)) 
      reply = {type: 'html', value: result.toHtml()}
    
    else if (result and _.isFunction(result.toWidget)) 
      # This should return a string that can be evaled.
      reply = {type: 'widget', value: serialize(result.toWidget())}
    
    else 
      reply = {type: 'result', value: util.inspect(result)}
  catch err
    reply = {type: 'error', value: coffee.helpers.prettyErrorMessage err, "dashboard", code, false}
  flush()
  process.send reply

process.send 'ready'