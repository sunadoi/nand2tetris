const fs = require('fs');
const JackTokenizer = require('./jackTokenizer');
const SymbolTable = require('./symbolTable');
const VMWriter = require('./vmWriter');

const {
  TOKEN_TYPE,
  KEYWORDS,
  SYMBOLS,
  COMMAND,
  KIND,
  SEGMENT,
} = require('./constants');

class CompilationEngine {
  constructor(inputFilePath, outputFilePath) {
    this.jackTokenizer = new JackTokenizer(inputFilePath);
    this.symbolTable = new SymbolTable();
    this.vmWriter = new VMWriter(outputFilePath);

    this.outputFilePathForVM = outputFilePath;
    this.outputFilePathForXML = outputFilePath.slice(0, -3) + '.xml';
    fs.writeFileSync(this.outputFilePathForXML, '');
    this.className = '';

    this.indentCount = 0;
    this.labelCount = 0;
    this.compileClass();
  }

  writeElement(tagName, value) {
    fs.appendFileSync(this.outputFilePathForXML, `${'  '.repeat(this.indentCount)}<${tagName}> ${value} </${tagName}>` + '\n');
  }

  writeElementStart(tagName) {
    fs.appendFileSync(this.outputFilePathForXML, `${'  '.repeat(this.indentCount)}<${tagName}>` + '\n');
    this.indentCount++;
  }

  writeElementEnd(tagName) {
    this.indentCount--;
    fs.appendFileSync(this.outputFilePathForXML, `${'  '.repeat(this.indentCount)}</${tagName}>` + '\n');
  }

  // デバッグ用にxmlに出力する
  writeIdentifier(name, isDefined) {
    const indent = '  '.repeat(this.indentCount);
    const kind = this.symbolTable.kindOf(name);
    const type = this.symbolTable.typeOf(name);
    const index = this.symbolTable.indexOf(name);
    const info = `isDefined: ${isDefined}, type: ${type}, kind: ${kind}, index: ${index}`
    fs.appendFileSync(this.outputFilePathForXML, `${indent}<identifier> ${name} </identifier> ${info}` + '\n');
  }

  compileKeyword() {
    this.writeElement('keyword', this.jackTokenizer.keyWord());
    this.jackTokenizer.advance();
  }

  compileSymbol() {
    const symbol =
      this.jackTokenizer.currentToken === '<' ? '&lt;'
      : this.jackTokenizer.currentToken === '>' ? '&gt;'
      : this.jackTokenizer.currentToken === '&' ? '&amp;'
      : this.jackTokenizer.symbol();
    this.writeElement('symbol', symbol);
    this.jackTokenizer.advance();
  }

  compileIntegerConstant() {
    this.writeElement('integerConstant', this.jackTokenizer.intVal());
    this.jackTokenizer.advance();
  }

  compileStringConstant() {
    const stringVal = this.jackTokenizer.stringVal();
    this.writeElement('stringConstant', stringVal);
    this.vmWriter.writePush(SEGMENT.CONST, stringVal.length);
    this.vmWriter.writeCall('String.new', 1);

    for (let i = 0; i < stringVal.length; i++) {
      this.vmWriter.writePush(SEGMENT.CONST, stringVal.charCodeAt(i));
      this.vmWriter.writeCall('String.appendChar', 2);
    }

    this.jackTokenizer.advance();
  }

  compileIdentifier() {
    this.writeElement('identifier', this.jackTokenizer.identifier());
    this.jackTokenizer.advance();
  }

  compileVarName(isDefined, type = null, kind = null, shouldWritePush = false) {
    const name = this.jackTokenizer.identifier();
    if (isDefined) { // classVarDec, parameterList, varDec
      this.symbolTable.define(name, type, kind);
    } else if (shouldWritePush) { // term
      kind = this.symbolTable.kindOf(name);
      const segment =
        kind === KIND.STATIC ? SEGMENT.STATIC
        : kind === KIND.FIELD ? SEGMENT.THIS
        : kind === KIND.ARGUMENT ? SEGMENT.ARGUMENT
        : kind === KIND.VAR ? SEGMENT.LOCAL
        : ''
      this.vmWriter.writePush(segment, this.symbolTable.indexOf(name));
    } // else: subroutineCall, compileLet
    this.writeIdentifier(name, isDefined);
    this.jackTokenizer.advance();
  }

  compileType() {
    if ([KEYWORDS.INT, KEYWORDS.CHAR, KEYWORDS.BOOLEAN].includes(this.jackTokenizer.currentToken)) {
      this.compileKeyword();
      return;
    }
    this.compileIdentifier();
  }

  compileClass() {
    this.writeElementStart("class");
    this.compileKeyword();
    this.className = this.jackTokenizer.currentToken;
    this.compileIdentifier();
    this.compileSymbol();
    while ([KEYWORDS.STATIC, KEYWORDS.FIELD].includes(this.jackTokenizer.currentToken)) {
      this.compileClassVarDec();
    }
    while ([KEYWORDS.CONSTRUCTOR, KEYWORDS.FUNCTION, KEYWORDS.METHOD].includes(this.jackTokenizer.currentToken)) {
      this.compileSubroutine();
    }
    this.compileSymbol();
    this.writeElementEnd('class');
  }

  compileClassVarDec() {
    this.writeElementStart('classVarDec');
    const kind = this.jackTokenizer.currentToken;
    this.compileKeyword();
    const type = this.jackTokenizer.currentToken;
    this.compileType();
    this.compileVarName(true, type, kind);
    while(this.jackTokenizer.currentToken !== SYMBOLS.SEMI_COLON) {
      this.compileSymbol();
      this.compileVarName(true, type, kind);
    }
    this.compileSymbol();
    this.writeElementEnd('classVarDec')
  }

  compileSubroutine() {
    this.symbolTable.startSubroutine();
    this.writeElementStart('subroutineDec');
    const subroutineKeyword = this.jackTokenizer.currentToken;
    if (subroutineKeyword === KEYWORDS.METHOD) {
      this.symbolTable.define('this', this.className, SEGMENT.ARGUMENT);
    }
    this.compileKeyword();
    if (this.jackTokenizer.currentToken === KEYWORDS.VOID) {
      this.compileKeyword();
    } else {
      this.compileType();
    }
    const functionName = this.className + '.' + this.jackTokenizer.currentToken;
    this.compileIdentifier();
    this.compileSymbol();
    this.compileParameterList();
    this.compileSymbol();
    this.compileSubroutineBody(functionName, subroutineKeyword);
    this.writeElementEnd('subroutineDec');
  }

  compileParameterList() {
    this.writeElementStart('parameterList');
    if ([KEYWORDS.INT, KEYWORDS.CHAR, KEYWORDS.BOOLEAN].includes(this.jackTokenizer.currentToken) || this.jackTokenizer.tokenType() === TOKEN_TYPE.IDENTIFIER) {
      const type = this.jackTokenizer.currentToken;
      this.compileType();
      this.compileVarName(true, type, KIND.ARGUMENT);
      while (this.jackTokenizer.currentToken === SYMBOLS.COMMA) {
        this.compileSymbol();
        const type = this.jackTokenizer.currentToken;
        this.compileType();
        this.compileVarName(true, type, KIND.ARGUMENT);
      }
    }
    this.writeElementEnd('parameterList');
  }

  compileSubroutineBody(functionName, subroutineKeyword) {
    this.writeElementStart('subroutineBody');
    this.compileSymbol();
    this.vmWriter.writeFunctions(functionName, 0);
    if (subroutineKeyword === KEYWORDS.CONSTRUCTOR) {
      this.vmWriter.writePush(SEGMENT.CONST, this.symbolTable.varCount(KIND.FIELD));
      this.vmWriter.writeCall('Memory.alloc', 1);
      this.vmWriter.writePop(SEGMENT.POINTER, 0);
    } else if (subroutineKeyword === KEYWORDS.METHOD) {
      this.vmWriter.writePush(SEGMENT.ARGUMENT, 0);
      this.vmWriter.writePop(SEGMENT.POINTER, 0);
    }

    let nLocals = 0;
    while (this.jackTokenizer.currentToken === KEYWORDS.VAR) {
      const varNum = this.compileVarDec();
      nLocals += varNum;
    }
    if (nLocals !== 0) {
      const fileContent = fs.readFileSync(this.outputFilePathForVM, {encoding: "utf-8"});
      const newContent = fileContent.replace(`${functionName} 0`, `${functionName} ${nLocals}`);
      fs.writeFileSync(this.outputFilePathForVM, newContent);
    }

    this.compileStatements();
    this.compileSymbol();
    this.writeElementEnd('subroutineBody');
  }

  compileVarDec() {
    this.writeElementStart('varDec');
    this.compileKeyword();
    const type = this.jackTokenizer.currentToken;
    this.compileType();
    this.compileVarName(true, type, KIND.VAR);
    let varNum = 1;
    while (this.jackTokenizer.currentToken === SYMBOLS.COMMA) {
      varNum++;
      this.compileSymbol();
      this.compileVarName(true, type, KIND.VAR);
    }
    this.compileSymbol();
    this.writeElementEnd('varDec');
    return varNum;
  }

  compileStatements() {
    this.writeElementStart('statements');
    while ([KEYWORDS.LET, KEYWORDS.IF, KEYWORDS.WHILE, KEYWORDS.DO, KEYWORDS.RETURN].includes(this.jackTokenizer.currentToken)) {
      if (this.jackTokenizer.currentToken === KEYWORDS.LET) this.compileLet();
      if (this.jackTokenizer.currentToken === KEYWORDS.IF) this.compileIf();
      if (this.jackTokenizer.currentToken === KEYWORDS.WHILE) this.compileWhile();
      if (this.jackTokenizer.currentToken === KEYWORDS.DO) this.compileDo();
      if (this.jackTokenizer.currentToken === KEYWORDS.RETURN) this.compileReturn();
    }
    this.writeElementEnd('statements');
  }

  compileLet() {
    this.writeElementStart('letStatement');
    this.compileKeyword();
    const name = this.jackTokenizer.currentToken;
    this.compileVarName(false);
    const kind = this.symbolTable.kindOf(name);
    const index = this.symbolTable.indexOf(name);
    const segment =
        kind === KIND.STATIC ? SEGMENT.STATIC
        : kind === KIND.FIELD ? SEGMENT.THIS
        : kind === KIND.ARGUMENT ? SEGMENT.ARGUMENT
        : kind === KIND.VAR ? SEGMENT.LOCAL
        : ''
    if (this.jackTokenizer.currentToken !== SYMBOLS.EQUAL) { // varName[]
      this.compileSymbol();
      this.compileExpression();
      this.compileSymbol();

      this.vmWriter.writePush(segment, index);
      this.vmWriter.writeArithmetic(COMMAND.ADD);

      this.compileSymbol();
      this.compileExpression();
      this.vmWriter.writePop(SEGMENT.TEMP, 0);
      this.vmWriter.writePop(SEGMENT.POINTER, 1);
      this.vmWriter.writePush(SEGMENT.TEMP, 0);
      this.vmWriter.writePop(SEGMENT.THAT, 0);
    } else { // varName
      this.compileSymbol();
      this.compileExpression();
      this.vmWriter.writePop(segment, index)
    }

    this.compileSymbol();
    this.writeElementEnd('letStatement');
  }

  compileIf() {
    this.writeElementStart('ifStatement');
    const labelElse = `IF_ELSE_${this.labelCount}`;
    const labelEnd = `IF_END_${this.labelCount}`;
    this.labelCount++;

    this.compileKeyword();
    this.compileSymbol();
    this.compileExpression();
    this.vmWriter.writeArithmetic(COMMAND.NOT);
    this.vmWriter.writeIf(labelElse);
    this.compileSymbol();
    this.compileSymbol();
    this.compileStatements();
    this.compileSymbol();
    this.vmWriter.writeGoto(labelEnd);

    this.vmWriter.writeLabel(labelElse); // FIXME 自分のコンパイラとbuilt inのコンパイラでアウトプットが違う
    if (this.jackTokenizer.currentToken === KEYWORDS.ELSE) {
      this.compileKeyword();
      this.compileSymbol();
      this.compileStatements();
      this.compileSymbol();
    }
    this.vmWriter.writeLabel(labelEnd);
    this.writeElementEnd('ifStatement');
  }

  compileWhile() {
    this.writeElementStart('whileStatement');
    const labelLoop = `WHILE_LOOP_${this.labelCount}`
    const labelEnd = `WHILE_END_${this.labelCount}`
    this.labelCount++;

    this.vmWriter.writeLabel(labelLoop);
    this.compileKeyword();
    this.compileSymbol();
    this.compileExpression();
    this.vmWriter.writeArithmetic(COMMAND.NOT);
    this.vmWriter.writeIf(labelEnd);
    this.compileSymbol();
    this.compileSymbol();
    this.compileStatements();
    this.compileSymbol();
    this.vmWriter.writeGoto(labelLoop);
    this.vmWriter.writeLabel(labelEnd);
    this.writeElementEnd('whileStatement');
  }

  compileDo() {
    this.writeElementStart('doStatement');
    this.compileKeyword();
    this.compileSubroutineCall();
    this.compileSymbol();
    this.vmWriter.writePop(SEGMENT.TEMP, 0);
    this.writeElementEnd('doStatement');
  }

  compileReturn() {
    this.writeElementStart('returnStatement');
    this.compileKeyword();
    if (this.jackTokenizer.currentToken !== SYMBOLS.SEMI_COLON) {
      this.compileExpression();
    } else {
      this.vmWriter.writePush(SEGMENT.CONST, 0);
    }
    this.compileSymbol();
    this.vmWriter.writeReturn();
    this.writeElementEnd('returnStatement');
  }

  compileExpression() {
    this.writeElementStart('expression');
    this.compileTerm();
    while ([
      SYMBOLS.PLUS_SIGN,
      SYMBOLS.HYPHEN,
      SYMBOLS.ASTERISK,
      SYMBOLS.SLASH,
      SYMBOLS.AMPERSAND,
      SYMBOLS.VERTICAL_LINE,
      SYMBOLS.LESS_THAN_SIGN,
      SYMBOLS.GREATER_THAN_SIGN,
      SYMBOLS.EQUAL
    ].includes(this.jackTokenizer.currentToken)) {
      const symbol = this.jackTokenizer.currentToken;
      this.compileSymbol();
      this.compileTerm();

      if (symbol === SYMBOLS.PLUS_SIGN) this.vmWriter.writeArithmetic(COMMAND.ADD);
      if (symbol === SYMBOLS.HYPHEN) this.vmWriter.writeArithmetic(COMMAND.SUB);
      if (symbol === SYMBOLS.ASTERISK) this.vmWriter.writeCall('Math.multiply', 2);
      if (symbol === SYMBOLS.SLASH) this.vmWriter.writeCall('Math.divide', 2);
      if (symbol === SYMBOLS.AMPERSAND) this.vmWriter.writeArithmetic(COMMAND.AND);
      if (symbol === SYMBOLS.VERTICAL_LINE) this.vmWriter.writeArithmetic(COMMAND.OR);
      if (symbol === SYMBOLS.LESS_THAN_SIGN) this.vmWriter.writeArithmetic(COMMAND.LT);
      if (symbol === SYMBOLS.GREATER_THAN_SIGN) this.vmWriter.writeArithmetic(COMMAND.GT);
      if (symbol === SYMBOLS.EQUAL) this.vmWriter.writeArithmetic(COMMAND.EQ);
    }
    this.writeElementEnd('expression');
  }

  compileTerm() {
    this.writeElementStart('term');

    if (this.jackTokenizer.tokenType() === TOKEN_TYPE.INT_CONST) {
      this.vmWriter.writePush(SEGMENT.CONST, this.jackTokenizer.currentToken);
      this.compileIntegerConstant();
    }

    if (this.jackTokenizer.tokenType() === TOKEN_TYPE.STRING_CONST) this.compileStringConstant();

    if (this.jackTokenizer.currentToken === KEYWORDS.TRUE) {
      this.vmWriter.writePush(SEGMENT.CONST, 1);
      this.vmWriter.writeArithmetic(COMMAND.NEG);
      this.compileKeyword();
    } else if (this.jackTokenizer.currentToken === KEYWORDS.FALSE) {
      this.vmWriter.writePush(SEGMENT.CONST, 0);
      this.compileKeyword();
    } else if (this.jackTokenizer.currentToken === KEYWORDS.NULL) {
      this.vmWriter.writePush(SEGMENT.CONST, 0);
      this.compileKeyword();
    } else if (this.jackTokenizer.currentToken === KEYWORDS.THIS) {
      this.vmWriter.writePush(SEGMENT.POINTER, 0);
      this.compileKeyword();
    }

    if (this.jackTokenizer.tokenType() === TOKEN_TYPE.IDENTIFIER) {
      let name = this.jackTokenizer.currentToken;
      if (this.symbolTable.kindOf(name) !== KIND.NONE) {
        this.compileVarName(false, null, null, true);
      } else {
        this.compileIdentifier();
      }
      if (this.jackTokenizer.currentToken === SYMBOLS.LEFT_SQUARE_BRACKET) {
        this.compileSymbol();
        this.compileExpression();
        this.compileSymbol();
        this.vmWriter.writeArithmetic(COMMAND.ADD);
        this.vmWriter.writePop(SEGMENT.POINTER, 1);
        this.vmWriter.writePush(SEGMENT.THAT, 0);
      }
      if (this.jackTokenizer.currentToken === SYMBOLS.LEFT_ROUND_BRACKET) {
        this.compileSymbol();
        const nArgs = this.compileExpressionList();
        this.compileSymbol();
        this.vmWriter.writeCall(name, nArgs);
      }
      if (this.jackTokenizer.currentToken === SYMBOLS.PERIOD) {
        this.compileSymbol();
        let nArgs = 0;
        if (this.symbolTable.kindOf(name) !== KIND.NONE) {
          name = this.symbolTable.typeOf(name);
          nArgs = 1;
        }
        name = name + '.' + this.jackTokenizer.currentToken;
        this.compileIdentifier();
        this.compileSymbol();
        nArgs = nArgs + this.compileExpressionList();
        this.compileSymbol();
        this.vmWriter.writeCall(name, nArgs);
      }
    }

    if (this.jackTokenizer.currentToken === SYMBOLS.LEFT_ROUND_BRACKET) {
      this.compileSymbol();
      this.compileExpression();
      this.compileSymbol();
    }
    if (this.jackTokenizer.currentToken === SYMBOLS.HYPHEN) {
      this.compileSymbol();
      this.compileTerm();
      this.vmWriter.writeArithmetic(COMMAND.SUB);
    }
    if (this.jackTokenizer.currentToken === SYMBOLS.TILDE) {
      this.compileSymbol();
      this.compileTerm();
      this.vmWriter.writeArithmetic(COMMAND.NOT);
    }
    this.writeElementEnd('term');
  }

  compileSubroutineCall() {
    let name = this.jackTokenizer.currentToken;
    let nArgs = 0;

    const kind = this.symbolTable.kindOf(name);
    if (kind !== KIND.NONE) { // varName.subroutineName
      const type = this.symbolTable.typeOf(name);
      const index = this.symbolTable.indexOf(name);
      nArgs++;

      if (kind === KIND.STATIC) this.vmWriter.writePush(SEGMENT.STATIC, index);
      if (kind === KIND.FIELD) this.vmWriter.writePush(SEGMENT.THIS, index);
      if (kind === KIND.ARGUMENT) this.vmWriter.writePush(SEGMENT.ARGUMENT, index);
      if (kind === KIND.VAR) this.vmWriter.writePush(SEGMENT.LOCAL, index);

      this.compileVarName(false);
      this.compileSymbol();
      name = type + '.' + this.jackTokenizer.currentToken;
      this.compileIdentifier();
    } else {
      this.compileIdentifier();
      if (this.jackTokenizer.currentToken === SYMBOLS.PERIOD) { // className.subroutineName
        this.compileSymbol();
        name = name + '.' + this.jackTokenizer.currentToken;
        this.compileIdentifier();
      } else { //  subroutineName
        this.vmWriter.writePush(SEGMENT.POINTER, 0);
        name = this.className + '.' + name;
        nArgs++;
      }
    }

    this.compileSymbol();
    nArgs = nArgs + this.compileExpressionList();
    this.compileSymbol();
    this.vmWriter.writeCall(name, nArgs);
  }

  compileExpressionList() {
    this.writeElementStart('expressionList');
    let nArgs = 0;
    if (this.jackTokenizer.currentToken !== SYMBOLS.RIGHT_ROUND_BRACKET) {
      nArgs = 1;
      this.compileExpression();

      while (this.jackTokenizer.currentToken === SYMBOLS.COMMA) {
        this.compileSymbol();
        this.compileExpression();
        nArgs++;
      }
    }
    this.writeElementEnd('expressionList');
    return nArgs;
  }
}

module.exports = CompilationEngine;