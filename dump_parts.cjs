const fs = require('fs');
const code = fs.readFileSync('extracted_original_app.js', 'utf8');

// Let's write a de-minifier/formatter that formats JSX and statements
let formatted = '';
let indent = 0;

// Or simpler: let us use an AST or basic tokenizer to print formatted code
fs.writeFileSync('raw_app_source.js', code);
console.log('App source saved to raw_app_source.js');

// Also print the initial constants
const constsEnd = code.indexOf('function se(');
console.log('Constants:\n', code.slice(0, constsEnd));
