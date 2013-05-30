cp = require 'child_process'
path = require 'path'
_ = require 'underscore'
marked = require 'marked'

chunkBlockComments = (code) ->
  splits = code.split /(###)/
  chunks = []
  comment = false
  for split in splits
    if split == '###'
      comment = not comment
    else if comment
      chunks.push ['blockComment', split]
    else
      chunks.push ['unknown', split]
  chunks

chunkLineComments = (code) ->
  lines = code.split '\n'
  chunks = []
  curChunk = ""
  comment = false
  for line in lines
    trLine = line.trim()
    if trLine[0] == '#'
      if comment
        curChunk += '\n' + line
      else
        if curChunk.length > 0 then chunks.push ['code', curChunk.trim()]
        curChunk = line
        comment = true
    else
      if comment
        if curChunk.length > 0 then chunks.push ['comment', curChunk]
        curChunk = line
        comment = false
      else
        curChunk += '\n' + line
  if curChunk.length > 0
    if comment
      chunks.push ['comment', curChunk]
    else
      chunks.push ['code', curChunk.trim()]
  chunks

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
    # communicating with the child process at all.
    if code[0] == 'comment'
      dashboard.comment(code[1])
      # The dashboard is now ready to take the next code chunk.
      dashboard.prompt('coffee> ')
      next()
    # If the code is a block comment, we assume that it's 
    else if code[0] == 'blockComment'
      dashboard.markdown marked code[1]
      dashboard.prompt('coffee>')
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
    chunks = chunkBlockComments code
    newChunks = []
    for chunk in chunks
      if chunk[0] == 'unknown'
        newChunks.push.apply newChunks, chunkLineComments chunk[1]
      else
        newChunks.push chunk
    console.log JSON.stringify newChunks
    newChunks

  # We report that the dashboard is ready to start taking input.
  dashboard.prompt('coffee> ')
  dashboard.ready()
