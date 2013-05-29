shell = require 'shelljs'

task 'compile-sense', ->
  console.log 'Compiling Sense files.'
  # shell.exec 'sense --stdLib=false --sourceMap=true -c -o lib src'
  shell.exec 'coffee -c -o lib src'
  
task 'build', ->
  shell.rm '-rf', 'lib'
  shell.mkdir 'lib'
  invoke 'compile-sense'
