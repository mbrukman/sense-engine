# Run using 'cake test'.

senseDashboard = require 'sense-dashboard' 
assert = require('chai').assert

describe 'io', =>
  # This first test is a way to define 'tester' synchronously
  # using Mocha's done() function.
  tester = undefined
  it 'creating dashboard', (done) =>
    senseDashboard.test require('../lib/index').createDashboard, (tester_) =>
      tester = tester_
      done()

  it 'should not output assignment results', (done) =>
    tester "a=0", (output) =>
      assert.equal(output.length, 1)
      assert.equal(output[0].type, "code")
      done()

  it 'should output other results', (done) =>
    tester "a", (output) =>
      assert.equal(output.length, 2)
      assert.equal(output[0].type, "code")
      assert.equal(output[1].type, "text")
      assert.equal(output[1].data, "0")
      done()
    
  
  it 'should output code before runtime errors', (done) =>
    tester "b", (output) =>
      assert.equal(output.length, 2)
      assert.equal(output[0].type, "code")
      assert.equal(output[1].type, "error")
      done()
    
  
  it 'should output short syntax errors with no code', (done) =>
      tester "(", (output) =>
        assert.equal(output.length, 1)
        assert.equal(output[0].type, "error")
        assert.equal(output[0].data.split("\n").length, 3)
        done()
    
  
  it 'should render block comments', (done) =>
    tester "###\nSome documentation.\n###", (output) =>
      assert.equal(output.length, 1)
      assert.equal(output[0].type, "html")
      done()
    
  it 'should not render line comments', (done) =>
    tester "#line1\n#line2\n\n#line3", (output) =>
      assert.equal(output.length, 2)
      assert.equal(output[0].type, "comment")
      assert.equal(output[1].type, "comment")
      done()
    
  
  it 'should group multiline statements', (done) =>
    tester "((x) =>\n  x*x\n)(2)", (output) =>
      assert.equal(output.length, 2)
      assert.equal(output[0].type, "code")
      assert.equal(output[1].type, "text")
      done()
      
  it 'should tolerate blank lines', (done) =>
    tester "a\n\nb", (output) =>
      assert.equal(output.length, 4)
      done()
    
  it 'should preserve result ordering', (done) =>
    code = (i for i in [0...1000]).join("\n")
    tester code, (output) =>
      for i in [0...output.length]
        if i % 2 == 0
          assert.equal(output[i].type, "code")
        else
          assert.equal(output[i].type, "text")
      done()

  it 'should preserve error ordering', (done) =>
    code = ("q" for i in [1...1000]).join("\n")
    tester code, (output) =>
      for i in [0...output.length]
        if i % 2 == 0
          assert.equal(output[i].type, "code")
        else
          assert.equal(output[i].type, "error")
      done()

  it 'should preserve stdout ordering', (done) =>
    code = ("console.log(#{i})" for i in [0...1000]).join("\n")
    tester code, (output) =>
      for i in [0...output.length]
        if i % 2 == 0
          assert.equal(output[i].type, "code", "Mismatch at #{i}")
        else
          assert.equal(output[i].type, "text", "Mismatch at #{i}")
      done()