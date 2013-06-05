#!/usr/local/bin/node

require('sense-dashboard').cli(require('../lib/index.js').createDashboard, process.argv[2]);