#!/usr/local/bin/node

require('sense-dashboard').repl(require('../lib/index.js').createDashboard, process.argv[2]);