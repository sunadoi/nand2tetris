const fs = require('fs');
const JackTokenizer = require('./jackTokenizer');
const {
  TOKEN_TYPE,
  KEYWORDS,
  SYMBOLS,
} = require('./constants');

class CompilationEngine {
  constructor(inputFilePath, outputFilePath) {
    this.outputFilePath = outputFilePath;
    fs.writeFileSync(this.outputFilePath, '');

    this.jackTokenizer = new JackTokenizer(inputFilePath);
    this.indentCount = 0;

    this.compileClass();
  }

  writeElement(tagName, value) {
    fs.appendFileSync(this.outputFilePath, `${'  '.repeat(this.indentCount)}<${tagName}> ${value} </${tagName}>` + '\n');
  }

  writeElementStart(tagName) {
    fs.appendFileSync(this.outputFilePath, `${'  '.repeat(this.indentCount)}<${tagName}>` + '\n');
    this.indentCount++;
  }

  writeElementEnd(tagName) {
    this.indentCount--;
    fs.appendFileSync(this.outputFilePath, `${'  '.repeat(this.indentCount)}</${tagName}>` + '\n');
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
    this.writeElement('stringConstant', this.jackTokenizer.stringVal());
    this.jackTokenizer.advance();
  }

  compileIdentifier() {
    this.writeElement('identifier', this.jackTokenizer.identifier());
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
    this.writeElementStart("tokens");
    this.compileKeyword();
    this.compileIdentifier();
    this.compileSymbol();
    while ([KEYWORDS.STATIC, KEYWORDS.FIELD].includes(this.jackTokenizer.currentToken)) {
      this.compileClassVarDec();
    }
    while ([KEYWORDS.CONSTRUCTOR, KEYWORDS.FUNCTION, KEYWORDS.METHOD].includes(this.jackTokenizer.currentToken)) {
      this.compileSubroutine();
    }
    this.compileSymbol();
    this.writeElementEnd('tokens');
  }

  compileClassVarDec() {
    this.compileKeyword();
    this.compileType();
    this.compileIdentifier();
    while(this.jackTokenizer.currentToken !== SYMBOLS.SEMI_COLON) {
      this.compileSymbol();
      this.compileIdentifier();
    }
    this.compileSymbol();
  }

  compileSubroutine() {
    this.compileKeyword();
    if (this.jackTokenizer.currentToken === KEYWORDS.VOID) {
      this.compileKeyword();
    } else {
      this.compileType();
    }
    this.compileIdentifier();
    this.compileSymbol();
    this.compileParameterList();
    this.compileSymbol();
    this.compileSubroutineBody();
  }

  compileParameterList() {
    while ([KEYWORDS.INT, KEYWORDS.CHAR, KEYWORDS.BOOLEAN].includes(this.jackTokenizer.currentToken) || this.jackTokenizer.tokenType() === TOKEN_TYPE.IDENTIFIER) {
      this.compileType();
      this.compileIdentifier();
      while (this.jackTokenizer.currentToken === SYMBOLS.COMMA) {
        this.compileSymbol();
        this.compileType();
        this.compileIdentifier();
      }
    }
  }

  compileSubroutineBody() {
    this.compileSymbol();
    while (this.jackTokenizer.currentToken === KEYWORDS.VAR) {
      this.compileVarDec();
    }
    this.compileStatements();
    this.compileSymbol();
  }

  compileVarDec() {
    this.compileKeyword();
    this.compileType();
    this.compileIdentifier();
    while (this.jackTokenizer.currentToken === SYMBOLS.COMMA) {
      this.compileSymbol();
      this.compileIdentifier();
    }
    this.compileSymbol();
  }

  compileStatements() {
    while ([KEYWORDS.LET, KEYWORDS.IF, KEYWORDS.WHILE, KEYWORDS.DO, KEYWORDS.RETURN].includes(this.jackTokenizer.currentToken)) {
      if (this.jackTokenizer.currentToken === KEYWORDS.LET) this.compileLet();
      if (this.jackTokenizer.currentToken === KEYWORDS.IF) this.compileIf();
      if (this.jackTokenizer.currentToken === KEYWORDS.WHILE) this.compileWhile();
      if (this.jackTokenizer.currentToken === KEYWORDS.DO) this.compileDo();
      if (this.jackTokenizer.currentToken === KEYWORDS.RETURN) this.compileReturn();
    }
  }

  compileLet() {
    this.compileKeyword();
    this.compileIdentifier();
    while (this.jackTokenizer.currentToken !== SYMBOLS.EQUAL) {
      this.compileSymbol();
      this.compileExpression();
      this.compileSymbol();
    }
    this.compileSymbol();
    this.compileExpression();
    this.compileSymbol();
  }

  compileIf() {
    this.compileKeyword();
    this.compileSymbol();
    this.compileExpression();
    this.compileSymbol();
    this.compileSymbol();
    this.compileStatements();
    this.compileSymbol();
    if (this.jackTokenizer.currentToken === KEYWORDS.ELSE) {
      this.compileKeyword();
      this.compileSymbol();
      this.compileStatements();
      this.compileSymbol();
    }
  }

  compileWhile() {
    this.compileKeyword();
    this.compileSymbol();
    this.compileExpression();
    this.compileSymbol();
    this.compileSymbol();
    this.compileStatements();
    this.compileSymbol();
  }

  compileDo() {
    this.compileKeyword();
    this.compileSubroutineCall();
    this.compileSymbol();
  }

  compileReturn() {
    this.compileKeyword();
    while (this.jackTokenizer.currentToken !== SYMBOLS.SEMI_COLON) {
      this.compileExpression();
    }
    this.compileSymbol();
  }

  compileExpression() {
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
      this.compileSymbol();
      this.compileTerm();
    }
  }

  compileTerm() {
    if (this.jackTokenizer.tokenType() === TOKEN_TYPE.INT_CONST) this.compileIntegerConstant();
    if (this.jackTokenizer.tokenType() === TOKEN_TYPE.STRING_CONST) this.compileStringConstant();
    if ([KEYWORDS.TRUE, KEYWORDS.FALSE, KEYWORDS.NULL, KEYWORDS.THIS].includes(this.jackTokenizer.currentToken)) {
      this.compileKeyword();
    }
    if (this.jackTokenizer.tokenType() === TOKEN_TYPE.IDENTIFIER) {
      this.compileIdentifier();
      if (this.jackTokenizer.currentToken === SYMBOLS.LEFT_SQUARE_BRACKET) {
        this.compileSymbol();
        this.compileExpression();
        this.compileSymbol();
      }
      if (this.jackTokenizer.currentToken === SYMBOLS.LEFT_ROUND_BRACKET) {
        this.compileSymbol();
        this.compileExpressionList();
        this.compileSymbol();
      }
      if (this.jackTokenizer.currentToken === SYMBOLS.PERIOD) {
        this.compileSymbol();
        this.compileIdentifier();
        this.compileSymbol();
        this.compileExpressionList();
        this.compileSymbol();
      }
    }
    if (this.jackTokenizer.currentToken === SYMBOLS.LEFT_ROUND_BRACKET) {
      this.compileSymbol();
      this.compileExpression();
      this.compileSymbol();
    }
    if ([SYMBOLS.HYPHEN, SYMBOLS.TILDE].includes(this.jackTokenizer.currentToken)) {
      this.compileSymbol();
      this.compileTerm();
    }
  }

  compileSubroutineCall() {
    this.compileIdentifier();
    if (this.jackTokenizer.currentToken === SYMBOLS.PERIOD) {
      this.compileSymbol();
      this.compileIdentifier();
    }
    this.compileSymbol();
    this.compileExpressionList();
    this.compileSymbol();
  }

  compileExpressionList() {
    while (this.jackTokenizer.currentToken !== SYMBOLS.RIGHT_ROUND_BRACKET) {
      this.compileExpression();
      while (this.jackTokenizer.currentToken === SYMBOLS.COMMA) {
        this.compileSymbol();
        this.compileExpression();
      }
    }
  }
}

module.exports = CompilationEngine;