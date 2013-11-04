# Sense Engine API

[![Build Status](https://travis-ci.org/SensePlatform/sense-engine.png)](https://travis-ci.org/SensePlatform/sense-engine)

This module gives you everything you need to run your favorite
programming language or console-based  application as an engine on
[Sense's](https://senseplatform.com) cloud infrastructure.  By
building on Sense, you automatically get a scalable cloud compute
infrastructure, a beautiful user interface,  and a powerful REST API
for your engine.

![Sense R Engine](https://s3.amazonaws.com/sense-files/rscreenshot.png)

Sense includes built in support for R, Python, and [JavaScript](https://github.com/SensePlatform/sense-js-engine).

## Writing a New Engine

Sense uses NodeJS's [NPM](https://npmjs.org/) modules as a
standard interface and isolated installation mechanism for engines.  If you're
familiar with NodeJS modules, writing an engine for Sense is simple.

Engines just implement a basic Engine API and include a `sense` entry in the
modules `package.json` file. Full details are below.  The `examples` folder includes a simple
engine to get you started. For a more complete example, see Sense's
[JavaScript](http://github.com/SensePlatform/sense-js-engine) engine.

## Installing a New Engine

Installing an engine is Sense is just like installing an NPM package.  Simply run
`npm install new-engine-name` in one of your projects. This will install the engine 
locally in the project's `node_modules` folder.

When you launch a dashboard from that project in the future, the new engine 
will automatically appear in the engine list.

![Engine List](https://sense.global.ssl.fastly.net/assets/c48e701f-screenshot-new.png)

Since engines are installed locally, you can be confident that your project will always
work even if you use a different version of the engine on a different project.

## Engine API

Engines are modules that export a `createEngine` function that returns an engine
implementation.  When you launch a dashboard, this engine function will be called
and Sense will hook the engine into the entire cloud infastructure without any
extra work required.

### Basic Engine Implementation

```javascript
exports.createEngine = function() {
  
  // Create a base engine implementation using this module.
  var engine = require('sense-engine')();
 
  engine.interrupt = function() {
    // Implement interrupt behavior to handle when users click 'interrupt'.
    // Interrupting is often accomplished by running the engine in a process 
    // and using worker_process.kill('SIGINT').
  }

  engine.execute = function(code, next) {

    // This function is responsible for echoing the code to the dashboard,
    // sending the code to the engine, then notifying the dashboard when
    // processing is complete and next command can be sent in.
    //
    // First, echo the code back to the dashboard. Add the language name for 
    // syntax highlighting.
    engine.code(code, 'language-name');
    
    // The real work is done here; run the code in the engine and produce
    // a text or html representation of the result.
    var result = // ...

    engine.text(result); // or engine.html(result) for html output

    // Call next when the engine is ready for the next command.  This
    // allows for asyncronous execution of code.
    next();
  };

  engine.chunk = function(code, cb) {
    // Your engine needs a 'chunker', a function that takes a string of code
    // and passes to a callback an array of strings, where each element is a 
    // complete statement, block comment, or other complete code unit. These 
    // chunks will be sent to dashboard.execute one at a time.
    //
    // This extremely simple example chunker just splits the input up into 
    // lines.  It is up to you to decide what form of chunking is most appropriate
    // for your application.

    cb(code.split('\n'));
  };

  // Call engine.ready() when the dashboard if first ready to 
  // take input. You can call it from a callback if you need to wait for
  // some event in a worker process.
  engine.ready();

  // Return the engine instance.
  return engine;
};
```

### Avoid Blocking the Event Loop

It is important that none of engine methods runs for a long time so
that NodeJS is free to listen for incoming events. The execute
method, in particular, should usually delegate to a [child process](http://nodejs.org/api/child_process.html).

### Output API

The following output methods of the engine can be called at any time
to emit output to the dashboard. In particular, they allow the
`execute` function to output any result or error associated with a
chunk of code.

```javascript

// Display a string as plain text.
engine.text(string)

// Display a string as syntax-highlighted code.
engine.code(string, languageName)

// Display an error message. If available, `details` can contain a stack 
// trace or other multi-line information about the error.
engine.error(message, details)

// Display a string as light-colored text. Be sure to strip leading comment
// tokens like # or // from the string first.
engine.comment(string)

// Render a Markdown string to HTML and display it.
engine.markdown(string)

// Set the dashboard prompt to something nonstandard.
engine.prompt(string)

// Display an arbitrary HTML element in the dashboard.
engine.html(string)
```

### Conventions

* Implement a rich display system so that a bare object at the command prompt
  displays a rich HTML representation.  See the JavaScript engine for an example.
* Expose the engine ouput functions to users within the engine via a base library.
* Hide output on assignment to avoiding cluttering the dashboard.
* Render block comments as markdown.


## The package.json File

Sense engines must have a `sense` entry in the `package.json` file that signals that
your module is in fact an engine.  This entry also tells the UI what name to give it
in the engine list, how to highlight code typed into the dashboard, what file extensions
the engine can execute, and defins . For example:

```JavaScript
{
  "name": "new-engine-name",
  "version": 1.0.0,
  "sense": {
    "name": "CustomDashboard",
    "mode": "my-language",
    "fileExtensions": ["cd", "custdash", "customdashboard"],
    "lineComment": "//",
    "blockComment": ["/*", "*/"],
  }
}
```

## Testing

If your engine fails to launch a dashboard on Sense, we'll do our best
to report the error to you; but it's sometimes easier to run your engine as
a command line-based repl while developing, and then
deploy to Sense after you're pretty sure it works.

The `repl` function is this module can help. To implement a console based REPL for 
debugging, simply create a script such as `bin/new-engine-name` with:

```
#!/usr/bin/env node
require('../').createEngine().repl();
```

In the repl, you can switch into multiline mode by pressing ctrl-v. In
multiline mode, the repl will accumulate the code you type or paste in
until it sees a blank line.

You may always want to write unit tests for your engine.  The module as a 
function called `test` that returns a function which takes input and passes all
resulting output to a callback.

```javascript
require('new-engine-name').createEngine().test(function(tester) {
  var input = "console.log('hello')"
  tester(input, function(output) {
    // Output should be a code cell followed by a text cell. 
    // Put code here to verify that.  The console REPL can
    // help you debug.
  });
});
```

The `tester` function is delivered to a callback rather than returned
because dashboard startup is usually asynchronous. However, you can
use Mocha to [sequence asynchronous
tests](http://visionmedia.github.io/mocha/#asynchronous-code). See the
test folder in the [JavaScript](http://github.com/SensePlatform/sense-js-
engines) engines for an example.

## Support

Thanks for helping make Sense awesome.  Need help?  Get in touch.

* Email: support@senseplatform.com
* Twitter: https://twitter.com/SensePlatform
* Google Group: https://groups.google.com/forum/?fromgroups#!forum/sense-users
* IRC: `#senseplatform` on `irc.freenode.net`

## LICENSE

MIT