use js ops

# Echo Dashboard Example
module.exports = (dashboard) =>
  
  dashboard.execute = (input, next) =>
    dashboard.code(input, 'text')
    if input == "exit"
      process.exit()
    
    setTimeout(=>
      dashboard.text(input)
      next()
    , 500)

  dashboard.chunk = (input) =>
    return input.split("\n")

  dashboard.complete = (input) =>
    completions = ['exit', 'text:', 'code:', 'comment:', 'markdown:', 'html:', 'widget:', 'prompt:']
    hits = completions.filter((c) => return c.indexOf(input) == 0)
    return [(if hits.length then hits else completions), input]