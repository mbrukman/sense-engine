cp = require 'child_process'
path = require 'path'
_ = require 'underscore'
bufferstream = require 'bufferstream'

module.exports = (dashboard) ->
  
  dashboard.worker = cp.fork path.join(__dirname, 'child'), [], {silent: true}

  # We capture all output of the dashboard and report it as text. Note
  # that this will catch calls to console.log and such, not the results
  # of expressions that we evaluate.
  dashboard.worker.stdout.on 'data', (data) -> dashboard.text data
  dashboard.worker.stderr.on 'data', (data) -> dashboard.text data
  
  # A very simple autocomplete function that just matches against
  # the globals.
  dashboard.complete = (substr) ->
    names = Object.getOwnPropertyNames global
    _.filter names, (x) => x.indexOf(substr) == 0

  # This interrupt function just sends the SIGINT signal to the worker
  # process, but many other behaviors are possible.
  dashboard.interrupt = ->
    dashboard.worker.kill 'SIGINT'

  # This function is responsible for sending code to the worker process
  # for execution, returning any results to the dashboard, and notifying
  # the dashboard when the computation has stopped and the next command
  # can be sent in.
  dashboard.execute = (code, next) ->
    # If the code is a comment, we report it to the dashboard without
    # communicating with the child process at all. If the comments were
    # known to be in markdown format, the comment character '#' could be
    # stripped and the comment text could be passed to dashboard.markdown.
    if code[0] == 'comment'
      dashboard.comment(code[1])
      # The dashboard is now ready to take the next code chunk.
      dashboard.prompt('coffee> ')
      next()
    else
      code = code[1]  
      dashboard.code(code, 'coffeescript')
      dashboard.worker.send code
      # The next message we get from the dashboard will be the result of 
      # executing the code.
      dashboard.worker.once 'message', (m) ->
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
        dashboard.prompt('coffee> ')
        next()

  # A very simple chunker that splits code up into comments and actual code.
  # It doesn't split the code up into statements, which would make for nicer
  # looking dashboards.
  dashboard.chunk = (code) ->
    chunks = []
    buffer = ""
    lines = code.split("\n")
    inBlockComment = false
    lastWasComment = false
    for line in lines
      trLine = line.trim()
      if trLine.slice(0,3) == "###"
        if inBlockComment
          buffer += line
          chunks.push ['comment', buffer.trim()]
          buffer = ""
          inBlockComment = false  
        else
          if buffer.trim() != ""
            if lastWasComment
              chunks.push ['comment', buffer.trim()]
            else
              chunks.push ['code', buffer.trim()]
            buffer = ""
          buffer += line + "\n"
          inBlockComment = true
      else if line[0] == "#" and not inBlockComment
        if not lastWasComment and buffer.trim() != ""
            chunks.push ['code', buffer.trim()]
            buffer = ""
        buffer += line + "\n"
        lastWasComment = true
      else
        if inBlockComment
          buffer += line + "\n"
          continue
        else if lastWasComment
          chunks.push ['comment', buffer.trim()]
          buffer = ""
          lastWasComment = false
        if line.trim().length == 0 or line[0] == " " or (line.slice(0,4) == "else" and line.trim().length == 4) or line.slice(0,4) == "else "
          buffer += line + "\n"
        else
          if buffer.trim() != ""
            chunks.push ['code', buffer.trim()]
            buffer = ""
          buffer = line + "\n"
    if buffer
      if lastWasComment
        chunks.push ['comment', buffer.trim()]
      else if inBlockComment
        chunks.push ['comment', buffer.trim()]
      else if buffer.trim() != ""
        chunks.push ['code', buffer.trim()]
    chunks

  # We report that the dashboard is ready to start taking input.
  dashboard.prompt('coffee> ')
  dashboard.ready()
