const Hello = require('hello');

function createHello(name) {
  return new Hello(name);
}

// polyfill version 1
if (Hello.prototype.bye === undefined) {
  Hello.prototype.bye = function bye() {
    return `Goodbye ${this.name}!`;
  };
  createHello.polyfilled = true;
} else {
  createHello.polyfilled = false;
}

module.exports = createHello;
