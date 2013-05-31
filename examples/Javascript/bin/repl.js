#!/usr/local/bin/node

require('sense-dashboard').repl(require('../lib/index.js'), process.argv[2]);