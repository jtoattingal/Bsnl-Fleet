const fs = require('fs');
const code = fs.readFileSync('extracted_original_app.js', 'utf8');

// Let's create an analysis script that writes each function to a readable file
const functionNames = [
  'se', // BSNL Header Logo
  'ce', // Stat Card
  'le', // Station Calculation Breakdown
  'ue', // Login View
  'de', // New/Edit Entry Modal/Form
  'fe', // Entries Table
  'pe', // Monthly Allowance Progress Bar
  'me', // Month Selector
  'he', // User Dashboard
  'ge', // Monthly Logbook Report (official printable sheet)
  '_e', // Admin Panel
  've', // Root App
];

for (const fn of functionNames) {
  const pattern = new RegExp(`function\\s+${fn}\\s*\\([^{]*\\)\\{`);
  const match = code.match(pattern);
  if (match) {
    const startIdx = match.index;
    // Find matching brace
    let braceCount = 0;
    let endIdx = startIdx;
    let foundStart = false;
    for (let i = startIdx; i < code.length; i++) {
      if (code[i] === '{') {
        braceCount++;
        foundStart = true;
      } else if (code[i] === '}') {
        braceCount--;
        if (foundStart && braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    const fnCode = code.slice(startIdx, endIdx);
    fs.writeFileSync(`component_${fn}.js`, fnCode);
    console.log(`Saved component_${fn}.js (${fnCode.length} chars)`);
  }
}
