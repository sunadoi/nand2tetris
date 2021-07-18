const fs = require('fs');

const {
  PUSH,
} = require('./constants');

class CodeWriter {
  constructor(filePath) {
    this.outputPath = __dirname + '/' + filePath;
    fs.writeFileSync(this.outputPath, '');
    this.labelNum = 0;
    this.returnAddress = 0;
    this.writeInit();
  }

  writeInit() {
    this.writeCodes([
      '@256',
      'D=A',
      '@SP',
      'M=D'
    ]);
    this.writeCall('Sys.init', 0);
  }

  setFileName(fileName) {
    this.fileName = fileName;
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

  writeLabel(label) {
    this.writeCodes([`(${label})`]);
  }

  writeGoto(label) {
    this.writeCodes([
      `@${label}`,
      '0;JMP'
    ]);
  }

  writeIf(label) {
    this.writePopToA();
    this.writeCodes([
      "D=M",
      `@${label}`,
      "D;JNE"
    ]);
  }

  writeFunction(f, n) {
    this.writeCodes([
      `(${f})`,
      "D=0",
    ])
    new Array(n).map((_, i) => this.writePushFromD())
  }

  writeCall(f, m) {
    this.writeCodes([
      `@RETURN_ADDRESS_${this.returnAddress}`,
      'D=A',
    ]);
    this.writePushFromD()
    this.writeCodes([
      "@LCL",
      "D=M",
    ])
    this.writePushFromD();
    this.writeCodes([
      '@ARG',
      'D=M',
    ]);
    this.writePushFromD();
    this.writeCodes([
      '@THIS',
      'D=M',
    ]);
    this.writePushFromD();
    this.writeCodes([
      '@THAT',
      'D=M',
    ]);
    this.writePushFromD();
    this.writeCodes([
      "@SP",
      "D=M",
      `@${m}`,
      "D=D-A",
      "@5",
      "D=D-A",
      "@ARG",
      "M=D", // ARG = SP-n-5
      "@SP",
      "D=M",
      "@LCL",
      "M=D", // LCL = SP
    ])
    this.writeGoto(`@${f}`);
    this.writeCodes([`(@RETURN_ADDRESS_${this.returnAddress})`])
    this.returnAddress++;
  }

  writeReturn() {
    this.writeCodes([
      "@LCL",
      "D=M",
      "@R13", // R13にLCLを一時的に格納
      "M=D",
      "@5",
      "D=A",
      "@R13",
      "A=M-D", // FEAME-5
      "D=M",
      "@R14", // R14にRETを一時的に格納
      "M=D"
    ])
    this.writePopToA();
    this.writeCodes([
      "D=M",
      "@ARG",
      "A=M",
      "M=D",
      "@ARG",
      "D=M+1",
      "@SP",
      "M=D", // SP = ARG+1
      "@R13",
      "AM=M-1",
      "D=M",
      "@THAT",
      "M=D", // THAT = *(FRAME - 1)
      '@R13',
      'AM=M-1',
      'D=M',
      '@THIS',
      'M=D', // THIS = *(FRAME - 2)
      '@R13',
      'AM=M-1',
      'D=M',
      '@ARG',
      'M=D', // ARG = *(FRAME - 3)
      '@R13',
      'AM=M-1',
      'D=M',
      '@LCL',
      'M=D', // LCL = *(FRAME - 4)
      '@R14',
      'A=M',
      '0;JMP'
    ])
  }
}

module.exports = CodeWriter