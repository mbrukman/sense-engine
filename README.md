## Sense Platform engine creation utilities

This package gives you everything you need to run your favorite programming language or console-based application as an engine on [the Sense Platform](http://www.senseplatform.com)'s cloud infrastructure, using the same user interface as the official engines. 

User-defined engines are [npm](http://npmjs.org) modules that export a single function, which complies with the specification documented below. Their package.json files must have an entry called `sense`. There is a simple example engine to get you started in the examples folder. For real-life examples, see the [CoffeeScript](http://github.com/SensePlatform/CoffeeScriptEngine) and [JavaScript](http://github.com/SensePlatform/JavaScriptEngine) engines.

To deploy a custom engine, simply stick it in `/home/sense/node_modules` in one of your projects. When you launch dashboards from that project in the future, the new engine will be available in the dashboard type menu.

### The exported function

Your module should export a function of a single argument called `createDashboard`. The argument will be a dashboard instance, and the function should add the following attributes to it:

```JavaScript
exports.createDashboard = function(dashboard) {

  dashboard.complete = function(codeString, cb) {
    // Passes an array of completions to the callback.
  }

  dashboard.chunk = function(codeString, cb) {
    // Splits the code up into chunks, which may be statements, 
    // comments, etc. puts them in an array, and passes them to 
    // the callback. These chunks will be sent to dashboard.execute 
    // one at a time.
  }

  dashboard.interrupt = function() {
    // Returns nothing, but interrupts the dashboard somehow. This is 
    // often accomplished by running the dashboard in a worker and using 
    // worker.kill 'SIGINT'.
  }

  dashboard.execute = function(chunk, next) {
    // This function should send one chunk output by dashboard.chunk
    // to the dashboard's engine for execution, and should call 'next' 
    // once the execution is complete and any result has been passed 
    // to the output method documented below. 'next' can be 
    // called from a callback if that is easier. This function can
    // return before 'next' is called.
  }
};
```

It is important that none of these functions runs for a long time so that node.js is free to listen for incoming events. The execute function, in particular, should usually delegate to a separate thread or process.

The `output` method of the dashboard object can be called at any time to emit output from the dashboard. In particular, it allows the 'execute' function to output any result or error associated with a chunk of code. 

The single argument of `dashboard.output` is an object of the form `{mime, data, input}`. The `mime` parameter gives the [MIME type](http://en.wikipedia.org/wiki/Mime_type) of the output, and the `data` parameter contains the payload, which is usually plain text but may be a JavaScript object. The `input` parameter indicates whether the payload is echoing input, such as code or comments. The currently supported MIME types are:

* `text/plain`: Unformatted text.
* `text/r`, `text/python`, `text/javascript`, etc.: Code that should be displayed with syntax highlighting.
* `text/comment`: Code comments that should not be formatted.
* `text/markdown`: Markdown-formatted text that should be rendered and displayed as HTML.
* `text/prompt`: A nonstandard dashboard prompt.
* `text/html`: Arbitrary HTML that will be displayed in an iframe.
* `application/javascript`: Arbitrary JavaScript code that will be run in the user's browser.
* `application/error`: A custom MIME type for error messages. The `data` should be an object of the form `{message, details}` where `message` is 1-5 lines and `details` contains a stack trace or other detailed information.
* `application/warning`: A custom MIME type for warnings. The `data` object should be of the same form as `application/error`'s.
* `image/png`, `image/jpeg`, etc.: Images to be displayed in the dashboard. The `data` should be an object of the form {`src`, `height`, `width`}, where `src` is either a URL or a Base64-encoded string containing the image data.


### The `sense` entry in package.json

The `sense` entry signals that your module is in fact an engine, tells the UI what name to give it in the dashboard types menu, tells it how to highlight code typed into the dashboard, etc. For example:

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

If your engine fails to launch a dashboard on Sense, we'll do our best to report the error to you; but it's much easier to run your engine as a command line-based repl while developing and testing it, and then deploy to Sense after you're pretty sure it works.

To do this, pass the name of your module to the `sense-repl` binary. You can give it the `--pretty` option to format the output nicely and/or a `--startupScript` option, which is the name of a file containing code. The dashboard will execute the file's contents before taking any more input. 

In the repl, you can switch into multiline mode by pressing ctrl-v. In multiline mode, the repl will accumulate the code you type or paste in until it sees a blank line.

### Testing with Mocha or another unit testing framework

To help you write unit tests for your engine, this module exports a function called `test` that turns the engine into a function that takes input and passes all resulting output to a callback. 

```JavaScript
require('sense-dashboard').test(dashboardModule.createDashboard, function(tester) {
  var input = "console.log('hi')"
  tester(input, function(output) {
    // Output should be a code cell followed by a text cell. 
    // Put code here to verify that.
  });
});
```

The tester function is delivered to a callback rather than returned because dashboard startup is usually asynchronous. However, you can use Mocha to [sequence asynchronous tests](http://visionmedia.github.io/mocha/#asynchronous-code). See the test folders in [these](http://github.com/SensePlatform/CoffeeScriptEngine) [two](http://github.com/SensePlatform/JavaScriptEngine) engines.
