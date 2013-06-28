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

  assertOutputTypes = (input, types, done) =>
    tester input, (output) =>
      try
        assert.equal(output.length, types.length)
      catch e
        done(e)
        return
      for i in [0...types.length]
        try
          assert.equal(output[i].type, types[i])
        catch e
          done(e)
          return
      done()

  it 'should not output assignment results', (done) =>
    assertOutputTypes "a=0", ["code"], done

  it 'should output other results', (done) =>
    assertOutputTypes "a", ["code", "text"], done    
  
  it 'should output code before runtime errors', (done) =>
    assertOutputTypes "b", ["code", "error"], done
  
  it 'should output short syntax errors with no code', (done) =>
    tester "(", (output) =>
      assert.equal(output.length, 1)
      assert.equal(output[0].type, "error")
      assert.equal(output[0].data.message.split("\n").length, 3)
      done()
    
  it 'should render block comments', (done) =>
    assertOutputTypes "###\nSome documentation.\n###", ["html"], done
    
  it 'should not render line comments', (done) =>
    assertOutputTypes "#line1\n#line2\n\n#line3", ["comment", "comment"], done    
  
  it 'should group multiline statements', (done) =>
    assertOutputTypes "((x) =>\n  x*x\n)(2)", ["code", "text"], done
      
  it 'should tolerate blank lines', (done) =>
    assertOutputTypes "a\n\nb", ["code", "text", "code", "error"], done
   
  it 'should produce html output', (done) =>
    assertOutputTypes "sense.html('a')", ["code", "html"], done

  it 'should produce widget output', (done) =>
    assertOutputTypes "sense.widget('a')", ["code", "widget"], done

  it 'should preserve result ordering', (done) =>
    n = 1000
    code = (i for i in [0...n]).join("\n")
    types = []
    for i in [0...n]
      types.push "code", "text"
    assertOutputTypes code, types, done

  it 'should preserve error ordering', (done) =>
    n = 10
    code = ("q" for i in [0...n]).join("\n")
    types = []
    for i in [0...n]
      types.push "code", "error"
    assertOutputTypes code, types, done

  it 'should preserve stdout ordering', (done) =>
    n = 1000
    code = ("console.log(#{i})" for i in [0...n]).join("\n")
    types = []
    for i in [0...n]
      types.push "code", "text"
    assertOutputTypes code, types, done
