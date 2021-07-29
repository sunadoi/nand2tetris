const { KIND } = require('./constants');

class SymbolTable {
  constructor() {
    this.staticTable = {};
    this.fieldTable = {};
    this.argTable = {};
    this.varTable = {};
  }

  startSubroutine() {
    this.argTable = {};
    this.varTable = {};
  }

  define(name, type, kind) {
    if (kind === KIND.STATIC) {
      this.staticTable[name] = {
        type,
        kind,
        index: this.varCount(KIND.STATIC)
      };
    }
    if (kind === KIND.FIELD) {
      this.fieldTable[name] = {
        type,
        kind,
        index: this.varCount(KIND.FIELD)
      };
    }
    if (kind === KIND.ARGUMENT) {
      this.argTable[name] = {
        type,
        kind,
        index: this.varCount(KIND.ARGUMENT)
      };
    }
    if (kind === KIND.VAR) {
      this.varTable[name] = {
        type,
        kind,
        index: this.varCount(KIND.VAR)
      };
    }
  }

  varCount(kind) {
    if (kind === KIND.STATIC) return Object.keys(this.staticTable).length;
    if (kind === KIND.FIELD) return Object.keys(this.fieldTable).length;
    if (kind === KIND.ARGUMENT) return Object.keys(this.argTable).length;
    if (kind === KIND.VAR) return Object.keys(this.varTable).length;
  }

  kindOf(name) {
    if (name in this.argTable) return this.argTable[name].kind;
    if (name in this.varTable) return this.varTable[name].kind;
    if (name in this.staticTable) return this.staticTable[name].kind;
    if (name in this.fieldTable) return this.fieldTable[name].kind;
    return KIND.NONE;
  }

  typeOf(name) {
    if (name in this.argTable) return this.argTable[name].type;
    if (name in this.varTable) return this.varTable[name].type;
    if (name in this.staticTable) return this.staticTable[name].type;
    if (name in this.fieldTable) return this.fieldTable[name].type;
  }

  indexOf(name) {
    if (name in this.argTable) return this.argTable[name].index;
    if (name in this.varTable) return this.varTable[name].index;
    if (name in this.staticTable) return this.staticTable[name].index;
    if (name in this.fieldTable) return this.fieldTable[name].index;
  }
}

module.exports = SymbolTable