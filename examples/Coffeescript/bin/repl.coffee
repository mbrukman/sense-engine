#!/usr/local/bin/coffee
optimist = require 'optimist'

argv = optimist.
  alias('p', 'pretty').
  alias('s', 'startupScript').
  describe('p', 'Format output to make repl pleasant to use, as opposed to a good debugging tool.').
  describe('s', 'A file to source before taking input from the user.').
  argv

require('sense-dashboard').repl require('../src/index.coffee').createDashboard, argv.startupScript, {pretty: argv.pretty}
