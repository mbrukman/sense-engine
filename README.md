# Sense Engine API

[![Build Status](https://travis-ci.org/SensePlatform/sense-engine.png)](https://travis-ci.org/SensePlatform/sense-engine)

[Sense](https://senseplatform.com) is a collaborative cloud platform for data science that makes
it radically easier to build, scale, and deploy data analysis and big data analytics projects, 
regardless of the  tools you use.  Sense has built in support for R, Python, and JavaScript,
but can be extended to any interactive tool such as a new language like [Julia](http://julialang.org/)
or cluster computing framework like  [Spark](http://spark.incubator.apache.org/).

This module gives you everything you need to build a Sense engine for your favorite programming language
or interactive  data analysis tool. By building on Sense, you automatically get an interactive cloud
user interface, scalable worker infrastructure, shared project filesystem, private project network, 
interactive and job-based workflow, and powerful REST API.  Sense allows you to focus on 
the core of your engine, while providing users a world class experience that 
seamlessly integrates with their other tools.

![Sense R Engine](https://s3.amazonaws.com/sense-files/rscreenshot.png)

We're just getting started.  If you're building an engine on Sense, drop us a line, we'd love to help.

## Writing a New Engine

Sense uses [Node.js](http://nodejs.org/) [NPM](https://npmjs.org/) modules as a
standard interface and isolated installation mechanism for engines.  If you're
familiar with Node.js, writing an engine for Sense should be simple.

Engines implement a basic Engine API and include a `sense` entry in the
module's `package.json` file. Full details are below.  The `examples` folder includes
an echo engine to get you started. For a more complete example, see Sense's
[JavaScript](http://github.com/SensePlatform/sense-js-engine) engine.

## Installing a New Engine

Installing a new engine in Sense is just like installing an NPM package. Run

```
npm install new-engine-name
```

in one of your projects. This will install the engine locally in the project's `/home/sense/node_modules`
folder. When you launch a new dashboard from that project in the future, the installed engine 
will appear automatically in the engine list.

![Engine List](https://sense.global.ssl.fastly.net/assets/c48e701f-screenshot-new.png)

Since engines are installed locally, you can be confident that your project will always
work even if you use a different version of the engine on a different project.  Sense
is designed for stable and reproducible deployment.

## Engine API

Engines are modules that export a `createEngine` function that returns an engine
implementation.  When you launch a dashboard, this engine function will be called
and the engine will hook into Sense's entire cloud infrastructure.  You can then
interact with the engine the same way you do with Sense's built in engines: interactively
in a dashboard, through an [exported job](http://help.senseplatform.com/getting-started#jobs), 
or via Sense's [REST API](http://help.senseplatform.com/api/rest).

### Basic Engine Implementation

```javascript
exports.createEngine = function() {
  
  // Create a base engine instance using this module.
  var engine = require('sense-engine')();
 
  engine.interrupt = function() {
    // Implement interrupt behavior to handle when users click 'interrupt'.
    // Interrupting is often accomplished by running the engine in a child process 
    // and using workerProcess.kill('SIGINT').
  }

  engine.execute = function(code, next) {
    // Execute code and display the results.
    //
    // This function is responsible for echoing the code to the dashboard,
    // sending the code to the engine, and then notifying the dashboard when
    // processing is complete and next command can be sent in.
    //
    // First, echo the code back to the dashboard. Add the language name for 
    // syntax highlighting.
    engine.code(code, 'language-name');
    
    // The real work is done here; run the code in the engine and produce
    // a text or html representation of the result.
    var result = (your engine evaluation logic)
    engine.text(result); // or engine.html(result) for html output

    // Ask for the next code chunk with next.  This
    // allows for asyncronous execution of code.
    next();
  };

  engine.chunk = function(code, cb) {
    // Chunk code into pieces that can be executed in order.
    //
    // The chunker is a function that takes a string of code
    // and passes to a callback an array of strings, where each element is a 
    // complete statement, block comment, or other complete code unit. These 
    // chunks will be sent to dashboard.execute one at a time.
    //
    // This extremely simple example chunker just splits the input up into 
    // lines.  It is up to you to decide what form of chunking is most appropriate
    // for your application.

    cb(code.split('\n'));
  };

  engine.complete = function(input, cursorPos) {
    // Autocompletes the given partial input in response to tab.
    // Should eventually trigger a call to engine.completion().

    // The callback should be called with the token under the cursor and the 
    // completion options for it. The token should be an object with 'start',
    // and 'end' attributes, such that the content of the token under the cursor
    // is input.slice(start, end). The completions should be an array of strings.

    cb({
      token: {start: 0, end: 2}
      completions: [
        "axes", "axis", axial", "axiom", "axisymmetry"
      ]
    });
  };

  // Call engine.ready() when the dashboard is first ready to 
  // take input. You can call ready from a callback if you need to wait for
  // some event in a worker process.
  engine.ready();

  // Return the engine instance.
  return engine;
};
```

### Output API

On Sense, engines can output anything from plain text to rich interactive widgets.
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

// Display a warning message.
engine.warning(message, details)

// Display a string as light-colored text. Be sure to strip leading comment
// tokens like # or // from the string first.
engine.comment(string)

// Display a HTML output as help.
engine.help(string)

// Render a Markdown string to HTML and display it.
engine.markdown(string)

// Set the dashboard prompt to something nonstandard.
engine.prompt(string)

// Display an image. "src" should be a valid value for an
// html image tag. If it is a url, it must be https, not
// plain http.
engine.image({
  src,
  width,
  height,
  alt,
  title
})

// Display simple HTML outside an IFrame.
engine.html(html)

// Display arbitrary HTML in an IFrame.
engine.iframe({
  src,
  width,
  height
})
```

IFrame output can include arbitrary HTML, including JavaScript. Simple HTML output should pass AngularJS's [$sanitize](http://docs.angularjs.org/api/ngSanitize.$sanitize) function.

### Best Practices

* Don't block the event loop for a long time so that the engine is free to listen for incoming events. The execute
  method, in particular, should usually delegate to a [child process](http://nodejs.org/api/child_process.html).
* Hide output on assignment to avoiding cluttering the dashboard.
* Render block comments as markdown.
* Implement a rich display system so that a bare object at the command prompt
  displays a rich representation by default.  See the JavaScript engine for an example.
* Expose the engine ouput functions to users within the engine via a library.

## The package.json File

Sense engines must have a `sense` entry in their `package.json` file to signal that
the module is in fact an engine.  This entry also tells the UI what name to give the engine
in the engine list, how to highlight code typed into the editor, how to comment out lines of
code in the editor, and what file extensions the engine can execute.

A basic `package.json` file might look like:

```JavaScript
{
  "name": "new-engine-name",
  "version": 1.0.0,
  "sense": {
    "name": "My Engine Name",
    "mode": "my-engine-language",
    "fileExtensions": ["cd", "custengine", "customengine"],
    "lineComment": "//",
    "blockComment": ["/*", "*/"],
  }
}
```

## Testing Your Engine

If your engine fails to launch on Sense, we'll do our best
to report the error to you; but it's sometimes easier to run your engine as
a command line REPL while developing, and then deploy to Sense after you're pretty 
sure it works correctly.

To make local testing easy, engines have a `repl` function that creates a console-based
REPL.  To create a REPL for your engine, simply create a script such as 
`bin/new-engine-name` with:

```
#!/usr/bin/env node
require('../').createEngine().repl();
```

You can run the REPL using `bin/new-engine-name`.  Within the REPL, you can switch 
into multiline mode by pressing ctrl-v. In multiline mode, the repl will accumulate 
the code you type or paste in until it sees a blank line.

You may also want to write unit tests for your engine.  Engines have a method called 
`test` that returns a function `tester` which takes input and passes all
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
because engine startup is usually asynchronous. You can use this function with your
favorite NodeJS testing library. The [JavaScript](http://github.com/SensePlatform/sense-js-
engines) engine uses [Mocha](http://visionmedia.github.io/mocha/)
to [sequence asynchronous tests](http://visionmedia.github.io/mocha/#asynchronous-code).

## Support

Thanks for helping make Sense awesome.  Need help?  Get in touch.

* Email: support@senseplatform.com
* Twitter: https://twitter.com/SensePlatform
* Google Group: https://groups.google.com/forum/?fromgroups#!forum/sense-users
* IRC: `#senseplatform` on `irc.freenode.net`

## LICENSE

MIT
