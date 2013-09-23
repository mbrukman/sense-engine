# Sense Engine API

[![Build Status](https://travis-ci.org/SensePlatform/sense-engine.png)](https://travis-ci.org/SensePlatform/sense-engine)

This module gives you everything you need to run your favorite
programming language or console-based  application as an engine on
[Sense's](https://senseplatform.com) cloud infrastructure.  By
building on Sense, you automatically get a scalable cloud compute
infrastructure, a beautiful user interface,  and a powerful REST API
for your engine.

![Sense Engine](http://i.imgur.com/5AMnsSS.png)

Sense includes built in support for R, Python, and JavaScript.

## Building Engines

Sense uses NodeJS's [NPM](https://npmjs.org/) modules to provide a
standard interface and isolated installation mechanism for engines.
To build and engine you must define an NPM module that:

1. exports a `createEngine` function
2. includes a `sense` entry in its `package.json` file.

There is a simple example engine to get you started in the `examples`
folder. For a real example, see Sense's
[JavaScript](http://github.com/SensePlatform/sense-js-engine) engine.

## Installing Engines

To install a custom engine on Sense, simply `npm install` it into one
of your projects. When you launch a dashboards from that project in
the future, the new engine options will  be available in the engine
menu.

## API

Your module should export a function called `createEngine`. It should
first create an engine by calling this module's exported function, add
a few methods to it, call its `ready` method, and return it:

```javascript
exports.createEngine = function() {
  var engine = require('sense-engine')();
 
  engine.interrupt = function() {
    // This is called when users click 'interrupt'. It returns nothing, but
    // interrupts the engine somehow. This is often accomplished by running 
    // the engine in a process and using worker_process.kill('SIGINT').
  }

  engine.execute = function(code, next) {
    // This function is responsible for echoing the code to the dashboard,
    // sending the code to the engine, then notifying the dashboard when
    // processing is complete and next command can be sent in.
    //
    // First, echo the code back to the dashboard. 
    // Add the language name for syntax highlighting.
    engine.code(code, 'language-name');
    
    // The real work is done here; run the code in the engine and produce
    // a text or html representation of the result.
    var result = // ...
    
    engine.text(result); // or engine.html(result) for html output
    next();
  };

  engine.chunk = function(code, cb) {
    // Your engine needs a 'chunker', a function that takes a string of code
    // and passes to a callback an array of strings, where each element is a 
    // complete statement, block comment, or other complete code unit. These 
    // chunks will be sent to dashboard.execute one at a time.
    //
    // This extremely simple example chunker just splits the input up into 
    // lines.

    cb(code.split('\n'));
  };

  // This method call lets the dashboard know that the engine is ready to 
  // take input. You can call it from a callback if you need to wait for
  // some event in a worker process.
  engine.ready();

  return engine;
};
```

It is important that none of these methods runs for a long time so
that Node.js is free to listen for incoming events. The execute
method, in particular, should usually delegate to a separate thread or
process.

The following output methods of the engine can be called at any time
to emit output to the dashboard. In particular, they allow the
'execute' function to output any result or error associated with a
chunk of code.

```JavaScript
// Display a string as plain text.
engine.text(string)

// Display a string as syntax-highlighted code.
engine.code(string, languageName)

// Display an error message. If available, `details` can contain a stack 
// trace or other multi-line information about the error.
dashboard.error(message, details)

// Display a string as light-colored text. Be sure to strip leading comment
// tokens like # or // from the string first.
dashboard.comment(string)

// Render a Markdown string to HTML and display it.
dashboard.markdown(string)

// Set the dashboard prompt to something nonstandard.
dashboard.prompt(string)

// Display an arbitrary HTML element in the dashboard.
dashboard.html(string)
```

### The `sense` entry in package.json

The `sense` entry signals that your module is in fact an engine, tells
the UI what name to give it in the dashboard types menu, tells it how
to highlight code typed into the dashboard, etc. For example:

```JavaScript
{
  ...,
  "sense": {
    "name": "CustomDashboard",
    "mode": "my-language",
    "fileExtensions": ["cd", "custdash", "customdashboard"],
    "lineComment": ""
  }
}
```

### Testing from the command line

If your engine fails to launch a dashboard on Sense, we'll do our best
to report the error to you; but it's much easier to run your engine as
a command line-based repl while developing and testing it, and then
deploy to Sense after you're pretty sure it works.

To do this, run your module's `createEngine` function and call the
engine object's `repl` method.

In the repl, you can switch into multiline mode by pressing ctrl-v. In
multiline mode, the repl will accumulate the code you type or paste in
until it sees a blank line.

### Testing with Mocha or another unit testing framework

To help you write unit tests for your engine, it has a method called
`test` that returns a function which takes input and passes all
resulting output to a callback.

```JavaScript
require('engine-module').createDashboard().test(function(tester) {
  var input = "console.log('hello')"
  tester(input, function(output) {
    // Output should be a code cell followed by a text cell. 
    // Put code here to verify that.
  });
});
```

The tester function is delivered to a callback rather than returned
because dashboard startup is usually asynchronous. However, you can
use Mocha to [sequence asynchronous
tests](http://visionmedia.github.io/mocha/#asynchronous-code). See the
test folders in [this](http://github.com/SensePlatform/sense-js-
engines) engines.

## Support

Thanks for helping make Sense awesome.  Need help?  Get in touch.

* Email: support@senseplatform.com
* Google Group: https://groups.google.com/forum/?fromgroups#!forum/sense-users
* IRC: `#senseplatform` on `irc.freenode.net`
