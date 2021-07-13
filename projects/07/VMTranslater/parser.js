const fs = require('fs');
const path = require("path");

const {
  ARITHMETIC,
  PUSH,
  POP,
  LABEL,
  GOTO,
  IF,
  FUNCTION,
  RETURN,
  CALL
} = require('./constants');

class Parser {
  constructor(filePath) {
    const file = fs.readFileSync(path.resolve(__dirname, filePath), {encoding: "utf-8"})
    const lines = file.split(/\r\n/);
    this.instructions = lines.filter((line) => {
      return line !== '' && line.indexOf("//") !== 0;
    });
    this.lineCounter = 0;
    this.currentCommand = this.instructions[this.lineCounter];
  }
  hasMoreCommands() {
    return this.lineCounter < this.instructions.length;
  }
  advance() {
    if (!this.hasMoreCommands()) return;
    this.lineCounter++
    this.currentCommand = this.instructions[this.lineCounter]?.split("//")[0];
    return;
  }
  commandType() {
    if (this.currentCommand.startsWith("push")) return PUSH;
    if (this.currentCommand.startsWith("pop")) return POP;
    if (this.currentCommand.startsWith("label")) return LABEL;
    if (this.currentCommand.startsWith("goto")) return GOTO;
    if (this.currentCommand.startsWith("if-goto")) return IF;
    if (this.currentCommand.startsWith("function")) return FUNCTION;
    if (this.currentCommand.startsWith("call")) return CALL;
    if (this.currentCommand.startsWith("return")) return RETURN;
    return ARITHMETIC;
  }
  arg1() {
    if (this.commandType() === RETURN) return;
    if (this.commandType() === ARITHMETIC) return this.currentCommand;
    return this.currentCommand.split(" ")[1];
  }
  arg2() {
    if (![PUSH, POP, FUNCTION, CALL].includes(this.commandType())) return;
    return this.currentCommand.split(" ")[2];
  }
}

module.exports = Parser