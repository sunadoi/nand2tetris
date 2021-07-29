const fs = require("fs");
const path = require("path");
const CompilationEngine = require('./compilationEngine');

const jackAnalize = () => {
  const directoryPath = process.argv[2];
  const jackFiles = fs.readdirSync(path.resolve(__dirname, directoryPath)).filter(file => file.endsWith(".jack"));

  jackFiles.forEach(fileName => {
    const inputFilePath = directoryPath + '/' + fileName;
    const outputFilePath = __dirname + '/' + (directoryPath + '/' + fileName).slice(0, -5) + '.vm';
    new CompilationEngine(inputFilePath, outputFilePath);
  })
};

jackAnalize();