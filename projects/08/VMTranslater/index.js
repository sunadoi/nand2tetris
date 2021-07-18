const fs = require("fs");
const path = require("path");

const Parser = require('./parser');
const CodeWriter = require('./codeWriter');

const {
  ARITHMETIC,
  PUSH,
  POP,
  LABEL,
  GOTO,
  IF,
  FUNCTION,
  CALL,
  RETURN,
} = require('./constants');

const translate = (fileName, filePath, codeWriter) => {
  const parser = new Parser(filePath);
  codeWriter.setFileName(fileName);

  while (parser.hasMoreCommands()) {
    if (parser.commandType() === ARITHMETIC) codeWriter.writeArithmetic(parser.arg1());
    if (parser.commandType() === PUSH) codeWriter.writePushPop(PUSH, parser.arg1(), parser.arg2());
    if (parser.commandType() === POP) codeWriter.writePushPop(POP, parser.arg1(), parser.arg2());
    if (parser.commandType() === LABEL) codeWriter.writeLabel(parser.arg1());
    if (parser.commandType() === GOTO) codeWriter.writeGoto(parser.arg1());
    if (parser.commandType() === IF) codeWriter.writeIf(parser.arg1());
    if (parser.commandType() === FUNCTION) codeWriter.writeFunction(parser.arg1(), parser.arg2());
    if (parser.commandType() === CALL) codeWriter.writeCall(parser.arg1(), parser.arg2());
    if (parser.commandType() === RETURN) codeWriter.writeReturn();
    parser.advance();
  }
}

const vmTranslater = () => {
  const directoryPath = process.argv[2];
  const vmFiles = fs.readdirSync(path.resolve(__dirname, directoryPath)).filter(file => file.endsWith(".vm"));
  const codeWriter = new CodeWriter(directoryPath + directoryPath.slice(directoryPath.lastIndexOf('/')) + '.asm');

  vmFiles.map(fileName => {
    translate(fileName, `${directoryPath}/${fileName}`, codeWriter)
  })
};

vmTranslater();