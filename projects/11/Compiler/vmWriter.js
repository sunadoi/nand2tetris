const fs = require('fs');

class VMWriter {
  constructor(filePath) {
    this.filePath = filePath;
    fs.writeFileSync(this.filePath, '');
  }

  writeCodes(code) {
    fs.appendFileSync(this.filePath, code + '\n');
  }

  writePush(segment, index) {
    this.writeCodes(`push ${segment} ${index}`);
  }

  writePop(segment, index) {
    this.writeCodes(`pop ${segment} ${index}`);
  }

  writeArithmetic(command) {
    this.writeCodes(command);
  }

  writeLabel(label) {
    this.writeCodes(`label ${label}`);
  }

  writeGoto(label) {
    this.writeCodes(`goto ${label}`);
  }

  writeIf(label) {
    this.writeCodes(`if-goto ${label}`);
  }

  writeCall(name, nArgs) {
    this.writeCodes(`call ${name} ${nArgs}`);
  }

  writeFunctions(name, nLocals) {
    this.writeCodes(`function ${name} ${nLocals}`);
  }

  writeReturn() {
    this.writeCodes("return");
  }
}

module.exports = VMWriter