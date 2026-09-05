const fs = require('fs');
const code = fs.readFileSync('figma_bundle.js', 'utf8');

const urls = code.match(/https?:\/\/[^"'`\s)]+/g) || [];
const filteredUrls = [...new Set(urls)].filter(u => !u.includes('figma.site') && !u.includes('w3.org'));
console.log('URLs:', filteredUrls);

// Find what 'y' is in the bundle
const appCode = fs.readFileSync('extracted_original_app.js', 'utf8');
// Let's find all function names and declarations in extracted_original_app.js
const funcMatches = appCode.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/g) || [];
console.log('Functions:', funcMatches);
