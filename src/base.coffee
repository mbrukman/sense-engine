# Base dashboard implemention, handles IO.

# Dashboard implementations are functions that take a base dashboard and replace chunk, complete, and execute methods.

EventEmitter = require('events').EventEmitter
_ = require('underscore')
marked = require('marked')

class Dashboard extends EventEmitter
  constructor: (implementation) ->
    @_implementation = implementation
    @_commandQueue = []
    @_executing = false
    @_cell = 1
    @_lastType = null
    @_textBuffer = ''
    @_started = false
    @_executing = false
    # @worker is a child process. All dashboards need to have workers
    # to avoid blocking the event loop, so this should be overridden
    # in the implementation.
    @worker = process
    @_throttledText = _.debounce(@_flushText, 300)
    
  # Interface chunk, complete, execute
  chunk: (input) => [input]
  complete: (input) => []
  execute: (input, next) => undefined

  clearCommands: =>
    @_commandQueue = []

  _flushText: =>
    if @_textBuffer.length
      @emit 'output', {type: 'text', data: @_textBuffer, cell: @_cell}
      @_textBuffer = ''

  _increment: => @_cell += 1

  # Note, @_output never gets called if type == text.
  _output: (type, data) =>
    @_flushText()
    if @_lastType == 'text'
      @_increment()
    @emit 'output', {type: type, data: data, cell: @_cell}
    @_lastType = type
    @_increment()

  # Public output functions
  code: (code, language) => @_output 'code', {code: code, language: language}
  result: (result) => @_output 'result', result
  html: (html) => @_output 'html', html
  widget: (widget) => @_output 'widget', widget
  comment: (comment) => @_output 'comment', comment
  help: (help) => @_output 'html', html
  markdown: (markdown) => @_output 'html', marked(markdown)
  error: (error) => @_output 'error', error
  warning: (warning) => @_output 'warning', warning
  prompt: (prompt) => @_output 'prompt', prompt
  text: (text) =>
    @_textBuffer += text
    @_lastType = 'text'
    @_throttledText()

  input: (input) => 
    @_commandQueue = @_commandQueue.concat(@chunk(input))
    if not @_executing then @_next()

  interrupt: =>
    @clearCommands()
    @worker.kill 'SIGINT'

  _next: =>
    # Make sure all output is flushed.
    @_flushText()
    if @_commandQueue.length
      @emit 'processing'
      @_executing = true
      @execute(@_commandQueue.shift(), @_next)
    else  
      @emit 'ready'
      @_executing = false

  start: (startupScript) =>
    @_implementation(@)
    if startupScript then @_commandQueue = @_commandQueue.concat(@chunk(startupScript))
    # Note, we don't bother settig dashboard status here. The
    # host will handle that.
    @worker.on 'exit', => process.exit()
  
  ready: =>
    if not @_started
      @_started = true
      @emit 'started'
      @emit 'ready'
      @_next()

exports.createDashboard = (implementation) => new Dashboard(implementation)