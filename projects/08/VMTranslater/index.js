const Parser = require('./parser');
const CodeWriter = require('./codeWriter');

const {
  ARITHMETIC,
  PUSH,
  POP,
} = require('./constants');

const vmTranslater = () => {
  const filePath = process.argv[2];
  const parser = new Parser(filePath);
  const codeWriter = new CodeWriter(filePath);

  while (parser.hasMoreCommands()) {
    if (parser.commandType() === ARITHMETIC) codeWriter.writeArithmetic(parser.arg1());
    if (parser.commandType() === PUSH) codeWriter.writePushPop(PUSH, parser.arg1(), parser.arg2());
    if (parser.commandType() === POP) codeWriter.writePushPop(POP, parser.arg1(), parser.arg2());
    parser.advance();
  }
};

vmTranslater();