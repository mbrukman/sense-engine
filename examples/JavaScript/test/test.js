// run with mocha -u bdd

var senseDashboard = require('sense-dashboard');
var assert = require('chai').assert

describe('io', function() {
  // This first test is a way to define 'tester' synchronously
  // using Mocha's done() function.
  var tester;
  it('creating dashboard', function(done) {
    senseDashboard.test(require('../lib/index').createDashboard, function(tester_) {
      tester = tester_;
      done()
    });
  });

  var assertOutputTypes = function(input, types, done) {
    tester(input, function (output) {
      try {
        assert.equal(output.length, types.length)
      }
      catch (e) {
        done(e)
        return                
      }
      for (var i = 0; i < types.length; i++) {
        try {
          assert.equal(output[i].type, types[i]);
        }
        catch (e) {
          done(e);
          return;                                
        }
      }
      done();
    });
  };

  it('should not output assignment results', function(done) {
    assertOutputTypes("a=0", ["code"], done);
  });

  it('should not output assigned widgets', function(done) {
    assertOutputTypes("x={toWidget: (function() {return 0;})}", ["code"], done);
  });

  it('should not output assigned html', function(done) {
    assertOutputTypes("y={toHtml: (function() {return 0;})}", ["code"], done);
  });

  it('should prefer widget to html and text', function(done) {
    assertOutputTypes("({toHtml: (function() {return 0;}), toWidget: (function() {return 0;})})", ["code", "widget"], done);
  });

  it('should output other results', function(done) {
    assertOutputTypes("a", ["code", "text"], done);
  });

  it('should output code before runtime errors', function(done) {
    assertOutputTypes("b", ["code", "error"], done);
  });

  it('should output short syntax errors with no code', function(done) {
    assertOutputTypes("(", ["error"], done);
  });

  it('should render block comments', function(done) {
    assertOutputTypes("/*\nSome documentation.\n*/", ["html"], done);
  });

  it('should not render line comments', function(done) {
    assertOutputTypes("//line1\n//line2\n\n//line3", ["comment", "comment"], done);
  });

  it('should group multiline statements', function(done) {
    assertOutputTypes("(function(x) {\n  return x*x;\n})(2);", ["code", "text"], done);
  });

  it('schould recognize unparenthesized object literals', function(done) {
    assertOutputTypes("{x: 0};", ["code", "text"], done);
  });

  it('should tolerate blank lines', function(done) {
    assertOutputTypes("a\n\nb", ["code", "text", "code", "error"], done);
  });

  it('should produce html output', function(done) {
    assertOutputTypes("sense.html('a')", ["code", "html"], done);
  });

  it('should produce widget output', function(done) {
    assertOutputTypes("sense.widget('a')", ["code", "widget"], done);
  });

  it('should preserve result ordering', function (done) {
    var n = 1000;
    var code = [];
    for (var i = 0; i < n; i++) {
      code.push(i);
    }
    var types = [];
    for (i = 0; i < n; i++) {
      types.push("code", "text");
    }
    assertOutputTypes(code.join("\n"), types, done);
  });

  it('should preserve error ordering', function (done) {
    var n = 1000;
    var code = [];
    for (var i = 0; i < n; i++) {
      code.push("q");
    }
    var types = [];
    for (i = 0; i < n; i++) {
      types.push("code", "error");
    }
    assertOutputTypes(code.join("\n"), types, done);
  });

  it('should preserve stdout ordering', function (done) {
    var n = 1000;
    var code = [];
    for (var i = 0; i < n; i++) {
      code.push("console.log(" + i + ")");
    }
    var types = [];
    for (i = 0; i < n; i++) {
      types.push("code", "text");
    }
    assertOutputTypes(code.join("\n"), types, done);
  });

});