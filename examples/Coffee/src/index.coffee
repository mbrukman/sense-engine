util = require('util')
coffee = require 'coffee-script'
_ = require('underscore')

module.exports = (dashboard) ->
  
  stdoutOld = process.stdout.write.bind(process.stdout)
  stderrOld = process.stderr.write.bind(process.stderr)
  
  process.stdout.write = (data) ->
    dashboard.text(data)
    stdoutOld(data)

  process.stderr.write = (data) ->
    dashboard.error(data)
    stderrOld(data)

  dashboard.execute = (code, next) -> 
    if code[0] == 'comment'
      dashboard.comment(code[1])
    else
      code = code[1]  
      dashboard.code(code, 'coffeescript')
      if code.trim().length > 0
        try
          result = coffee.eval "(#{code}\n)", {
            filename: 'dashboard',
            modulename: 'dashboard'
          }
          split = code.trim().split(/\s+/)
          if result != undefined and not (split[1] in ["=", "+=", "-="])
            if _.isFunction(result.toHtml)
              dashboard.html(result.toHtml()) 
            else if _.isFunction(result.toWidget)
              # This should return a string that can be evaled.
              dashboard.widget(result.toWidget())
            else
              dashboard.result(util.inspect(result))
        catch error
          dashboard.error({message: error.toString(), stack: error.stack})
    next()

  # TODO: Better parser.
  dashboard.chunk = (code) ->
    chunks = []
    buffer = ""
    lines = code.split("\n")
    inBlockComment = false
    lastWasComment = false
    for line in lines
      if line.slice(0,3) == "###"
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
