var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');
var marked = require('marked');
var fs = require('fs');


var Dashboard = function Dashboard(implementation, handler, startupScript) {
  this._implementation = implementation;
  this._commandQueue = [];
  this._executing = false;
  this._cell = 1;
  this._lastType = null;
  this._textBuffer = '';
  this._started = false;
  this._executing = false;
  this._throttledText = _.debounce(this._flushText.bind(this), 300);
  if (startupScript != undefined) {
    this._startupScript = fs.readFileSync(startupScript).toString();
  }

  // The following functions should be redefined when 
  // implementation(this) is called.
  this.chunk = function(input) {
    return [input];
  };
  this.complete = function(input, next) {
    return [];
  };
  this.execute = function(input, next) {
    return void 0;
  };
  this.interrupt = function() {
    return void 0
  };

  handler(this);  
  implementation(this);

};


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
  this.chunk(input, (function(chunks) {
      this._commandQueue = this._commandQueue.concat(chunks);
      if (!this._executing) {
        this._next();
      }
    }).bind(this));
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

Dashboard.prototype.ready = function() {
  if (!this._started) {
    this._started = true;
    this.emit('started');
    this.emit('ready');
    if (this._startupScript) {
      this.chunk(this._startupScript, (function(chunks) {
        this._commandQueue = chunks;
        this._next();
      }).bind(this));
    }
  }
};

var rep = function rep(str, n) {
  var out = "";
  for (var i = 0; i < n; i++) {
    out += str;
  }
  return out;
}

var cliHandler = function cliHandler(dashboard, startupScript) {
  var path = require('path');
  var readline = require('readline');
  var defaultPrompt = "> "
  var prompt = defaultPrompt;
  var multiline = false;
  var multilineBuffer = [];

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: function(substr, cb) {
      dashboard.complete(substr, function(completion) {
        cb(null, [completion, substr]);
      })
    }
  });

// a = 
//   b: 1
//   c: 1

  process.stdin.on('keypress', function(char, key) {
    if (key && key.ctrl && !key.meta && key.name == 'v') {
      if (!multiline) {
        multilineBuffer = [];
        prompt = rep(".", prompt.length-1) + " ";
      }
      multiline = true;
    }
    else if (!multiline) prompt = defaultPrompt;
  });

  var lineProcessor = function (answer) {
    if (multiline) {
      if (answer.trim().length == 0) {
        multiline = false;
        prompt = defaultPrompt;
        dashboard.input(multilineBuffer.join('\n'));
      }
      else {
        multilineBuffer.push(answer);
        rl.question(prompt, lineProcessor);
      }
    }
    else {
      dashboard.input(answer);
    }
  };
  dashboard.on('ready', function() {
    rl.question(prompt, lineProcessor);
  });

  dashboard.on('output', function (data) {
    if (data.type == 'prompt' && !multiline) {
      prompt = data.data;
    }
    else {
      console.log(data)
    }
  });

  dashboard.on('executing', function () {
    console.log('status: executing');
  });

  rl.on('SIGINT', function() {
    dashboard.interrupt()
  });

};

var cli = function cli(implementation, startupScript) {
    var dashboard = new Dashboard(implementation, cliHandler, startupScript);
}

exports.Dashboard = Dashboard;
exports.cli = cli;