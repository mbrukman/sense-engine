cp = require 'child_process'
path = require 'path'
_ = require 'underscore'
marked = require 'marked'
coffee = require 'coffee-script'
cch = require 'comment-chunk-helper'

parse = (code, cb) =>
  try 
    # We leave the block comments to be handled by comment-chunk-helper, although
    # Coffeescript does generate AST nodes for them.
    statements = _.filter coffee.nodes(code).expressions, (expr) => not expr.comment
    statLocs = []
    for stat in statements
      l = stat.locationData
      statLocs.push {start: {line: l.first_line, column: l.first_column}, end: {line: l.last_line+1, column: l.last_column+1}}
    cb false, statLocs
  catch e
    cb coffee.helpers.prettyErrorMessage e, "dashboard", code, false

chunk = cch
  parser: parse
  lineComment: "#"
  blockComment: {left: "###", right: "###"}

exports.createDashboard = (dashboard) ->  
  worker = cp.fork path.join(__dirname, 'child'), [], {silent: true}
  # We report that the dashboard is ready to start taking input.
  worker.once 'message', readyListener = (m) ->
    if m == 'ready'
      dashboard.ready()
    else
      worker.once 'message', readyListener

  # We capture all output of the dashboard and report it as text. Note
  # that this will catch calls to console.log and such, not the results
  # of expressions that we evaluate.
  worker.stdout.on 'data', (data) -> dashboard.text data
  worker.stderr.on 'data', (data) -> dashboard.text data

  worker.on 'exit', process.exit
  
  # A very simple autocomplete function that just matches against
  # the globals.
  dashboard.complete = (substr, cb) ->
    names = Object.getOwnPropertyNames global
    cb _.filter names, (x) => x.indexOf(substr) == 0

  # This interrupt function just sends the SIGINT signal to the worker
  # process, but many other behaviors are possible.
  dashboard.interrupt = ->
    worker.kill 'SIGINT'

  # This function is responsible for sending code to the worker process
  # for execution, returning any results to the dashboard, and notifying
  # the dashboard when the computation has stopped and the next command
  # can be sent in.
  dashboard.execute = (chunk, next) ->
    # If the chunk is a comment, we report it to the dashboard without
    # communicating with the child process at all.
    if chunk.type == 'comment'
      dashboard.comment(chunk.value)
      # The dashboard is now ready to take the next code chunk.
      next()
    # If the chunk is a block comment, we assume that it's Markdown
    # documentation and pass it to the dashboard as such.
    else if chunk.type == 'blockComment'
      dashboard.markdown marked chunk.value
      next()
    else if chunk.type == 'error'
      dashboard.error(chunk.value)
      next()
    else
      code = chunk.value
      if code.trim().length > 0
        dashboard.code(code, 'coffeescript')
        worker.send code
        # The next message we get from the dashboard will be the result of 
        # executing the code.
        worker.once 'message', (m) ->
          switch m.type
            when 'result'
              if m.value != 'undefined' then dashboard.text m.value
            when 'error' 
              dashboard.error m.value
            when 'widget'
              dashboard.widget m.value
            when 'html'
              dashboard.html m.value
          # Whether the code returned a result or caused an error, the dashboard
          # is now ready to take the next code chunk.
          next()
      else
        next()

  dashboard.chunk = chunk