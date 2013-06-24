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

  it('should not output assignment results', function(done) {
    tester("a=0", function(output) {
      assert.equal(output.length, 1);
      assert.equal(output[0].type, "code");
      done();
    });
  });

  it('should output other results', function(done) {
    tester("a", function(output) {
      assert.equal(output.length, 2);
      assert.equal(output[0].type, "code");
      assert.equal(output[1].type, "text");
      assert.equal(output[1].data, "0");
      done();
    });
  });

  it('should output code before runtime errors', function(done) {
    tester("b", function(output) {
      assert.equal(output.length, 2);
      assert.equal(output[0].type, "code");
      assert.equal(output[1].type, "error");
      done();
    });
  });

  it('should output short syntax errors with no code', function(done) {
      tester("(", function(output) {
      assert.equal(output.length, 1);
      assert.equal(output[0].type, "error");
      assert.equal(output[0].data.message.split("\n").length, 3);
      done();
    });
  });

  it('should render block comments', function(done) {
    tester("/*\nSome documentation.\n*/", function(output) {
      assert.equal(output.length, 1);
      assert.equal(output[0].type, "html");
      done();
    });
  });

  it('should not render line comments', function(done) {
    tester("//line1\n//line2\n\n//line3", function(output) {
      assert.equal(output.length, 2);
      assert.equal(output[0].type, "comment");
      assert.equal(output[1].type, "comment");
      done();
    });
  });

  it('should group multiline statements', function(done) {
    tester("(function(x) {\n  return x*x;\n})(2);", function(output) {
      assert.equal(output.length, 2);
      assert.equal(output[0].type, "code");
      assert.equal(output[1].type, "text");
      done();
    });
  });

  it('schould recognize unparenthesized object literals', function(done) {
    tester("{x: 0};", function(output) {
      assert.equal(output.length, 2);
      assert.equal(output[0].type, "code");
      assert.equal(output[1].type, "text");
      done();
    });
  });

  it('should tolerate blank lines', function(done) {
    tester("a\n\nb", function(output) {
      assert.equal(output.length, 4);
      done();
    });
  });

  it('should preserve result ordering', function (done) {
    var code = [];
    for (var i = 0; i < 1000; i++) {
      code.push(i);
    }
    tester(code.join("\n"), function (output) {
      for (i = 0; i < output.length; i++) {
        if (i % 2 === 0) assert.equal(output[i].type, "code")
        else assert.equal(output[i].type, "text")
      }
      done()
    });
  });

  it('should preserve error ordering', function (done) {
    var code = [];
    for (var i = 0; i < 1000; i++) {
      code.push("q");
    }
    tester(code.join("\n"), function (output) {
      for (i = 0; i < output.length; i++) {
        if (i % 2 === 0) assert.equal(output[i].type, "code")
        else assert.equal(output[i].type, "error")
      }
      done()
    });
  });

  it('should preserve stdout ordering', function (done) {
    var code = [];
    for (var i = 0; i < 1000; i++) {
      code.push("console.log(" + i + ")");
    }
    tester(code.join("\n"), function (output) {
      for (i = 0; i < output.length; i++) {
        if (i % 2 === 0) assert.equal(output[i].type, "code")
        else assert.equal(output[i].type, "text")
      }
      done()
    });
  });

});