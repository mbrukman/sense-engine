coffee = require('coffee-script')
util = require('util')
vm = require('vm')
_ = require 'underscore'
cp = require 'child_process'
global.require = require
# Add a utility module to the globals.
global.sense = {
  install: (pkg) => 
    proc = cp.spawn "npm", ["install", pkg]
    proc.stdout.on "data", (dat) => console.log dat.toString()
    proc.stderr.on "data", (dat) => console.log dat.toString(),
    undefined
  html: (htmlCode) => process.send {type: 'html', value: htmlCode},
  widget: (javascriptCode) => process.send {type: 'widget', value: javascriptCode}
}

serialize = global.serialize or (obj) => obj.toString() 

outputCatcher = (chunk, encoding, cb) =>
  try
    process.send {
      type: "text",
      value: chunk.toString()
    }
    if cb then cb()
  catch e
    if cb then cb(err)

process.stdout._write = outputCatcher
process.stderr._write = outputCatcher

process.on 'message', (code) =>
  try
    if code.trim().length == 0
      reply = {type: result, value: ""}
    else
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
    reply = {type: 'error', value: {message: err.name + ": " + err.message, details: coffee.helpers.prettyErrorMessage err, "dashboard", code, false}}
  process.send reply

process.send 'ready'