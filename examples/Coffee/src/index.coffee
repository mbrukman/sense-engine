cp = require 'child_process'
path = require 'path'

module.exports = (dashboard) ->
  
  dashboard.worker = cp.fork path.join __dirname, 'child'

  dashboard.execute = (code, next) -> 
    if code[0] == 'comment'
      dashboard.comment(code[1])
    else
      code = code[1]  
      dashboard.code(code, 'coffeescript')
      dashboard.worker.send code
      dashboard.worker.once 'message', (m) ->
        switch m.type
          when 'result'
            dashboard.text m.value
          when 'error' 
            dashboard.error m.value
          when 'widget'
            dashboard.widget m.value
          when 'html'
            dashboard.html m.value
        dashboard.ready()
        next()


  # A very simple chunker that splits code up into comments and actual code.
  # It doesn't 
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

  dashboard.ready()
