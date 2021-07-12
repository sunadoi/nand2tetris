const fs =require('fs');
const path = require("path");

const CommandType = require("./constants");

class Parser {
  constructor(filePath) {
    const file = fs.readFileSync(path.resolve(__dirname, filePath), {encoding: "utf-8"})
    const lines = file.replace(/ /g, '').split(/\r\n/); // trimでもいい？ \nでもいい？
    this.instructions = lines.filter((line) => {
      return line !== '' && line.indexOf("//") !== 0;
    });
    this.lineCounter = 0;
    this.currentCommand = this.instructions[this.lineCounter];
  }
  hasMoreCommands() {
    return this.lineCounter < this.instructions.length
  }
  advance() {
    if (!this.hasMoreCommands()) return
    this.lineCounter++;
    this.currentCommand = this.instructions[this.lineCounter]?.split("//")[0];
    return;
  }
  commandType() {
    if (this.currentCommand.indexOf('@') === 0) {
      return CommandType.A;
    }
    if (this.currentCommand.indexOf('(') === 0) {
      return CommandType.L;
    }
    return CommandType.C;
  }
  symbol() {
    if (this.commandType() === CommandType.A) return this.currentCommand.slice(1);
    if (this.commandType() === CommandType.L) return this.currentCommand.slice(1,-1);
    throw new Error('commandType should be A_COMMAND or L_COMMAND');
  }
  dest() {
    if (this.commandType() !== CommandType.C) throw new Error('commantType should be C_COMMAND');
    if (!this.currentCommand.includes("=")) return null;
    return this.currentCommand.split("=")[0];
  }
  comp() {
    if (this.commandType() !== CommandType.C) throw new Error('commantType should be C_COMMAND');
    if (!this.currentCommand.includes("=")) return this.currentCommand.split(";")[0];
    return this.currentCommand.split("=")[1];
  }
  jump() {
    if (this.commandType() !== CommandType.C) throw new Error('commantType should be C_COMMAND');
    if (!this.currentCommand.includes(";")) return null;
    return this.currentCommand.split(";")[1];
  }
}

module.exports = Parser