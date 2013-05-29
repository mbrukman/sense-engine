var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');
var marked = require('marked');

// The public methods of dashboards are code, text, prompt, html, 
// widget, markdown, help error, warning and ready.
function Dashboard(implementation) {
  this._implementation = implementation;
  this._commandQueue = [];
  this._executing = false;
  this._cell = 1;
  this._lastType = null;
  this._textBuffer = '';
  this._started = false;
  this._executing = false;
  this._throttledText = _.debounce(this._flushText.bind(this), 300);

  // The following functions should be redefined when 
  // implementation(this) is called.
  this.worker = undefined;
  this.chunk = function(input) {
    return [input];
  };
  this.complete = function(input) {
    return [];
  };
  this.execute = function(input, next) {
    return void 0;
  };
  this.interrupt = function() {
    return void 0
  };
}

for (var prop in EventEmitter.prototype) {
  Dashboard.prototype[prop] = EventEmitter.prototype[prop]
}

Dashboard.prototype._flushText = function() {
  if (this._textBuffer.length) {
    this.emit('output', {
      type: 'text',
      data: this._textBuffer,
      cell: this._cell
    });
    return this._textBuffer = '';
  }
};

Dashboard.prototype._increment = function() {
  return this._cell += 1;
};

Dashboard.prototype._output = function(type, data) {
  this._flushText();
  if (this._lastType === 'text') {
    this._increment();
  }
  this.emit('output', {
    type: type,
    data: data,
    cell: this._cell
  });
  this._lastType = type;
  return this._increment();
};

Dashboard.prototype.code = function(code, language) {
  return this._output('code', {
    code: code,
    language: language
  });
};

Dashboard.prototype.html = function(html) {
  return this._output('html', html);
};

Dashboard.prototype.widget = function(widget) {
  return this._output('widget', widget);
};

Dashboard.prototype.comment = function(comment) {
  return this._output('comment', comment);
};

Dashboard.prototype.help = function(help) {
  return this._output('html', html);
};

Dashboard.prototype.markdown = function(markdown) {
  return this._output('html', marked(markdown));
};

Dashboard.prototype.error = function(error) {
  return this._output('error', error);
};

Dashboard.prototype.warning = function(warning) {
  return this._output('warning', warning);
};

Dashboard.prototype.prompt = function(prompt) {
  return this._output('prompt', prompt);
};

Dashboard.prototype.text = function(text) {
  this._textBuffer += text;
  this._lastType = 'text';
  return this._throttledText();
};

Dashboard.prototype.input = function(input) {
  this._commandQueue = this._commandQueue.concat(this.chunk(input));
  if (!this._executing) {
    return this._next();
  }
};

Dashboard.prototype._next = function() {
  this._flushText();
  if (this._commandQueue.length) {
    this.emit('processing');
    this._executing = true;
    return this.execute(this._commandQueue.shift(), this._next.bind(this));
  } else {
    this.emit('ready');
    return this._executing = false;
  }
};

Dashboard.prototype._interrupt = function() {
  this._commandQueue = [];
  this.interrupt()
}

Dashboard.prototype.start = function(startupScript) {
  this._implementation(this);
  if (!this.worker) {
    throw new Error("Worker process has not been defined.")
  }
  if (startupScript) {
    this._commandQueue = this._commandQueue.concat(this.chunk(startupScript));
  }
  return this.worker.on('exit', function() {
    return process.exit();
  });
};

Dashboard.prototype.ready = function() {
  if (!this._started) {
    this._started = true;
    this.emit('started');
    this.emit('ready');
    return this._next();
  }
};

Dashboard.cli = function(implementation) {
  var dashboard = new Dashboard(implementation);

  var path = require('path');
  var readline = require('readline');
  
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: function(substr) {return [dashboard.complete(substr), substr];}
  })

  dashboard.on('ready', function() {
    rl.question("> ", function (answer) {
      dashboard.input(answer);
    });
  });

  dashboard.on('output', function (data) {
    console.log(data);
  });

  dashboard.on('executing', function () {
    console.log('status: executing');
  });

  process.on('SIGINT', function() {
    dashboard.interrupt()
  });

  dashboard.start()

}

module.exports = exports = Dashboard