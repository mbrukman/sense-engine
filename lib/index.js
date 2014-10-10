var EventEmitter = require('events').EventEmitter;
var path = require('path');
var readline = require('readline');
var fs = require('fs');
var _ = require('lodash');
var optimist = require('optimist');

var rep = function rep(str, n) {
  var out = "";
  for (var i = 0; i < n; i++) {
    out += str;
  }
  return out;
};

var eraserToken = 'erase';

function Engine(options) {
  options = options || {};
  this._commandQueue = [];
  this._executing = false;
  this._cell = 0;
  this._lastInput = 1;
  this._lastType = null;
  this._textBuffer = '';
  this._started = false;
  this._executing = false;
  this._errored = false;
  this._throttledText = _.debounce(this._flushText.bind(this), 300);
  this._batch = options.batch;
  if (_.isString(options.startupScript) && options.startupScript !== "undefined" && options.startupScript !== "") {
    this._startupScript = fs.readFileSync(options.startupScript, 'utf8');
  }
  else if (_.isString(options.startupCode)  && options.startupCode !== "undefined" && options.startupCode !== "") {
    this._startupScript = options.startupCode;
  }
}

_.extend(Engine.prototype, EventEmitter.prototype);

Engine.prototype._flushText = function() {
  if (this._textBuffer.length) {
    if (this._lastType !== 'text') this._increment();
    this._lastType = 'text';
    this.emit('output', {
      type: 'text',
      data: this._textBuffer,
      cell: this._cell
    });
    this._textBuffer = '';
  }
};

Engine.prototype._increment = function() {
  this._cell += 1;
};

Engine.prototype._output = function(type, data) {
  this._flushText();
  this._increment();
  this.emit('output', {
    type: type,
    data: data,
    cell: this._cell
  });
  this._lastType = type;
};

Engine.prototype.text = function(text) {
  this._textBuffer += text;
  this._throttledText();
  return this;
};

Engine.prototype.html = function(html) {
  this._output('html', html);
  return this;
};

Engine.prototype.grid = function(data, columns, options) {
  this._output('grid', {data: data || [], columns: columns || {}, options: options || {}});
  return this;
};

Engine.prototype.error = function(message, details) {
  this._output('error', {message: message, details: details});
  this._commandQueue = [];
  this._errored = true;
  return this;
};

Engine.prototype.code = function(code, language) {
  this._output('code', {code: code, language: language});
  return this;
};                           

Engine.prototype.comment = function(comment) { 
  this._output('comment', comment);
  return this;
};

Engine.prototype.help = function(html) {
  this._output('help', html);
  return this;
};

Engine.prototype.markdown = function(markdown) {
  this._output('markdown', markdown);
  return this;
};

Engine.prototype.iframe = function(params) {
  this._output('iframe', {
    src: params.src, 
    srcdoc: params.srcdoc, 
    height: params.height, 
    width: params.width
  });
  return this;
};

Engine.prototype.html = function(html) {
  this._output('html', html);
  return this;
};

Engine.prototype.image = function(params) {
  this._output('image', {
    src: params.src,
    height: params.height,
    width: params.width,
    alt: params.alt,
    title: params.title
  });
  return this;
};

Engine.prototype.warning = function(message, details) {
  this._output('warning', {message: message, details: details});
  return this;
};

Engine.prototype.prompt = function(prompt) {
  this._output('prompt', prompt);
  return this;
};

Engine.prototype.input = function(input, overwriteLast) {
  this.chunk(input, (function(chunks) {
    if (overwriteLast) {
      this._commandQueue.push([eraserToken, this._lastInput]);
    }
    this._lastInput = this._cell+1;
    this._commandQueue = this._commandQueue.concat(chunks);
    if (!this._executing) {
      this._next();
    }
  }).bind(this));
  return this;
};

Engine.prototype._erase = function(cell) {
  this.emit('erase', cell);
};

Engine.prototype._next = function() {
  this._flushText();
  if (this._commandQueue.length) {
    var cmd = this._commandQueue.shift();
    if (cmd[0] === eraserToken) {
      for (var cell = cmd[1]; cell <= this._cell; cell++) {
        this._erase(cell);
      }
      this._cell = cmd[1]-1;
      this._next();
    }
    else {
      this.emit('executing');
      this._executing = true;
      this.execute(cmd, this._next.bind(this));
    }
  } else {
    this.ready();
    this._executing = false;
  }
};

Engine.prototype._interrupt = function() {
  this._commandQueue = [];
  this.warning('Interrupting engine.');
  this._commandQueue = [];
  this.interrupt();
};

Engine.prototype.ready = function() {
  // Ready is processed on the next tick to allow
  // for things like local repl to start.
  process.nextTick(function() {
    this.emit('ready');
    if (!this._started) {
      this._started = true;
      this.emit('started');
      if (_.isString(this._startupScript)) {
        this.chunk(this._startupScript, (function(chunks) {
          this._commandQueue = chunks;
          this._next();
        }).bind(this));
      }
      else if (this._commandQueue.length) {
        this._next();
      }
    }
    else if (this._batch) {
      this.exit(this._errored);
    }
  }.bind(this));
  return this;
};

Engine.prototype.chunk = function(input, cb) {
  cb([input]);
  return this;
};

Engine.prototype.complete = function(input, cb) {
  cb([]);
  return this;
};

Engine.prototype.execute = function(input, next) {
  this.code(input, 'plain');
  this.text(input);
  next();
  return this;
};

Engine.prototype.interrupt = function() {
  this.warning('Exiting.');
  this.exit(1);
  return this;
};

Engine.prototype.exit = function(code) {
  this.emit('exit', code);
  process.exit(code);
  return this;
};

/* Local repl for testing */
Engine.prototype.repl = function() {

  var opt = optimist
    .usage("Usage: sense-engine [--batch] [--startupScript=filename]")
    .describe('b', 'Exit on error or when command queue is empty.')
    .alias('b', 'batch')
    .boolean('b')
    .describe('s', 'Source file before taking input from user.')
    .alias('s', 'startupScript')
    .string('s')
    .describe('h', 'Show usage information.')
    .alias('h', 'help');

  var argv = opt.argv;

  if (argv.help) {
    opt.showHelp();
    process.exit(0);
  }

  if (argv.startupScript) {
    this._startupScript = fs.readFileSync(argv.startupScript, 'utf8');
  } 

  if (argv.batch) {
    this._batch = true;
  }

  var defaultPrompt = "> ";
  var prompt = defaultPrompt;
  var lastDisplayedPrompt = prompt;
  var multiline = false;
  var multilineBuffer = [];

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: function(substr, cb) {
      this.complete(substr, function(completion) {
        cb(null, [completion, substr]);
      });
    }
  });

  process.stdin.on('keypress', function(char, key) {
    if (key && key.ctrl && !key.meta && key.name === 'v' && !key.shift) {
      if (!multiline) {
        multilineBuffer = [];
        prompt = rep(".", lastDisplayedPrompt.length-1) + " ";
      }
      multiline = true;
    }
    else if (!multiline) prompt = defaultPrompt;
  });

  var lineProcessor = function (answer) {
    if (multiline) {
      if (answer.trim().length === 0) {
        multiline = false;
        prompt = defaultPrompt;
        this.input(multilineBuffer.join('\n'));
      }
      else {
        multilineBuffer.push(answer);
        lastDisplayedPrompt = prompt;
        rl.question(prompt, lineProcessor);
      }
    }
    else {
      this.input(answer);
    }
  }.bind(this);

  this.on('ready', function() {
    lastDisplayedPrompt = prompt;
    rl.question(prompt, lineProcessor);
  }.bind(this));

  this.on('output', function (data) {
    if (data.type === 'prompt' && !multiline) {
      prompt = data.data;
    }
    else {
      console.log(data);
    }
  });

  this.on('erase', function(cell) {
    console.log('Erasing cell', cell);
  });

  this.on('executing', function () {
    console.log('status: executing');
  });

  rl.on('SIGINT', function() {
    this._interrupt();
  }.bind(this));

  return this;
};


Engine.prototype.test = function(whenReady) {
  // Output events: 'ready', 'erase', 'executing', 'output'
  // Input methods: 'complete', 'input', 'interrupt'
  var engine = this;
  var tester = function(input, done) {
    var out = [];
    engine.removeAllListeners('output');
    engine.removeAllListeners('ready');
    engine.on('output', function(data) {
      out.push(data);
    });
    engine.once('ready', function() {
      done(out);
    });
    engine.input(input);
  };
  engine.once('ready', function() {
    whenReady(tester); 
  });
};

function createEngine(options) { 
  return new Engine(options);
}

module.exports = exports = createEngine;
