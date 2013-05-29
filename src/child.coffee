# Child process helper to allow readline testing interface that also requires stdout.

console.log process.argv

dashboard = require('./base').createDashboard(require(process.argv[2]))

dashboard.on 'ready', ->
  process.send {event: 'ready'}

dashboard.on 'output', (data) ->
  process.send {event: 'output', data: data}

dashboard.on 'executing', ->
  process.send {event: 'executing'}

process.on 'message', (msg) ->
  switch msg.event
    when 'input' then dashboard.input(msg.data)
    when 'start' then dashboard.start()
    when 'interrupt' then dashboard.interrupt()
    when 'exit' then process.exit()
    
process.on 'SIGINT', ->
  dashboard.interrupt()