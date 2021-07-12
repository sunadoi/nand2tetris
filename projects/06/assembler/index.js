const fs = require("fs");
const inputPath = '../pong/Pong.asm';
const outputPath = __dirname + '/../pong/Pong_create.hack';
const CommandType = require("./constants")
const Parser = require('./parser');
const Code = require('./code');
const SymbolTable = require("./symbolTable");

const assembler = () => {
  const parser = new Parser(inputPath);
  const code = new Code();
  const symbolTable = new SymbolTable();

  // 1回目のループでシンボリックテーブルを作成する
  let romAddress = 0;
  while (parser.hasMoreCommands()) {
    const commandType = parser.commandType();
    if (commandType === CommandType.A || commandType === CommandType.C) {
      romAddress++
      parser.advance();
      continue
    }
    if (!symbolTable.contains(parser.symbol())) {
      // ラベルシンボル: ROMのアドレスの位置を格納
      symbolTable.addEntry(parser.symbol(), ('000000' + romAddress.toString(16)).slice(-6));
    }
    parser.advance()
  }

  parser.lineCounter = 0;
  parser.currentCommand = parser.instructions[0];

  // 2回目のループでA命令とC命令をバイナリコードに変換する
  const binaries = [];
  let ramAddress = 16;
  while (parser.hasMoreCommands()) {
    const commandType = parser.commandType();
    if (commandType === CommandType.L) {
      parser.advance();
      continue;
    }
    if (commandType === CommandType.C) {
      binaries.push(`111${code.comp(parser.comp())}${code.dest(parser.dest())}${code.jump(parser.jump())}`);
      parser.advance();
      continue;
    }
    const symbol = parser.symbol();
    if (!isNaN(symbol)) {
      binaries.push(('0000000000000000' + parseInt(symbol).toString(2)).slice(-16));
      parser.advance();
      continue;
    }
    const address = symbolTable.contains(symbol)
      ? symbolTable.getAddress(symbol) // 1回目のループで格納したラベルシンボルのROMのアドレスの位置
      : "0x" + ("0000" + ramAddress.toString(16)).slice(-4);
    if (!symbolTable.contains(symbol)) {
      symbolTable.addEntry(symbol, address); // 変数シンボル: RAMアドレスの位置を格納
      ramAddress++;
    }
    binaries.push(('0000000000000000' + parseInt(address, 16).toString(2)).slice(-16));
    parser.advance()
  }

  fs.writeFileSync(outputPath, binaries.join('\n'));
}

assembler()