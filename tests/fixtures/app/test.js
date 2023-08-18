const qunit = require('qunit');
const createHello = require('./index');

qunit.module('project', () => {
  qunit.test('createHello', (assert) => {
    const hello = createHello('Joe');
    assert.equal(hello.hi(), 'Hello Joe!');
    assert.equal(hello.bye(), 'Goodbye Joe!');
  });
});
