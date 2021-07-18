const fs = require('fs');

const {
  PUSH,
} = require('./constants');

class CodeWriter {
  constructor(filePath) {
    this.outputPath = __dirname + '/' + filePath.slice(0, filePath.lastIndexOf('.')) + '.asm';
    this.fileName = this.outputPath.slice(this.outputPath.lastIndexOf('/') + 1);
    this.labelNum = 0;
    fs.writeFileSync(this.outputPath, '');
  }

  writeArithmetic(command) {
    if (["neg", "not"].includes(command)) return this.unaryFunction(command);
    if (["add", "sub", "and", "or"].includes(command)) return this.binaryFunction(command);
    this.compareFunction(command);
  }

  writePushPop(command, segment, index) {
    if (command === PUSH) {
      if (segment === "constant") {
        this.writeCodes([
          `@${index}`,
          'D=A'
        ]);
        this.writePushFromD();
        return;
      }
      if (segment === 'static') {
        this.writeCodes([
          `@${this.fileName}.${index}`,
          "D=M"
        ]);
        this.writePushFromD();
        return;
      }
      // (pointer, temp) or (local, argument, this, that)
      ["pointer", "temp"].includes(segment)
        ? this.writeCodes([`${this.getSymbolFromSegment(segment)}`])
        : this.writeCodes([
          `${this.getSymbolFromSegment(segment)}`,
          "A=M"
        ]);
      if (Number(index)) this.writeCodes(new Array(Number(index)).fill("A=A+1"));
      this.writeCodes(['D=M']);
      this.writePushFromD();
      return;
    }

    if (segment === 'constant') return;
    this.writePopToA();
    if (segment === 'static') {
      this.writeCodes([
        "D=M",
        `@${this.fileName}.${index}`,
        "M=D"
      ]);
      return;
    }
    ["pointer", "temp"].includes(segment)
      ? this.writeCodes([
          "D=M",
          `${this.getSymbolFromSegment(segment)}`,
        ])
      : this.writeCodes([
          "D=M",
          `${this.getSymbolFromSegment(segment)}`,
          'A=M',
        ])
    if (Number(index)) this.writeCodes(new Array(Number(index)).fill("A=A+1"));
    this.writeCodes(['M=D']);
  }

  unaryFunction(command) {
    this.writePopToA();
    this.writeCodes([command === "not" ? "D=!M" : "D=-M"]);
    this.writePushFromD();
  }

  binaryFunction(command) {
    let formula = ""
    switch (command) {
      case "add":
        formula = "D=D+M"
        break;
      case "sub":
        formula = "D=M-D"
        break;
      case "and":
        formula = "D=D&M"
        break;
      case "or":
        formula = "D=D|M"
        break;
    }
    this.writePopToA();
    this.writeCodes(["D=M"]);
    this.writePopToA();
    this.writeCodes([formula]);
    this.writePushFromD();
  }

  compareFunction(command) {
    this.writePopToA();
    this.writeCodes(["D=M"]);
    this.writePopToA();
    this.writeCodes([
      "D=M-D", // x - y
      `@TRUE_${this.labelNum}`,
      `D;${command === "eq" ? "JEQ" : command === "gt" ? "JGT" : "JLT"}`,
      "D=0", // false
      `@NEXT_${this.labelNum}`,
      "0;JMP",
      `(TRUE_${this.labelNum})`,
      "D=-1", // true
      `(NEXT_${this.labelNum})`,
    ]);
    this.writePushFromD();
    this.labelNum++
  }

  writeCodes(codes) {
    fs.appendFileSync(this.outputPath, codes.join('\n') + '\n');
  }

  // SPを-1して、そのアドレスを指す
  writePopToA() {
    this.writeCodes([
      "@SP",
      "M=M-1", // SPのアドレスを-1
      "A=M", // そのアドレスを指す
    ])
  }

  // 値を現在のメモリに格納した後にSPを+1する
  writePushFromD() {
    this.writeCodes([
      "@SP",
      "A=M", // アドレスをSPのアドレスにセット
      "M=D", // データをそのアドレスにセット
      "@SP",
      "M=M+1", // SPのアドレスを+1
    ])
  }

  getSymbolFromSegment(segment) {
    if (segment === "local") return "@LCL";
    if (segment === "argument") return "@ARG";
    if (segment === "this") return "@THIS";
    if (segment === "that") return "@THAT";
    if (segment === "pointer") return "@3";
    if (segment === "temp") return "@5";
  }
}

module.exports = CodeWriter