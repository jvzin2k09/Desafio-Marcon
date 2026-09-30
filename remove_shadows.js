const fs = require('fs');
const file = 'mobile/src/app/(tabs)/estoque.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace all boxShadows with a light border instead
code = code.replace(/boxShadow:\s*`[^`]+`/g, "borderWidth: 1, borderColor: '#E2E8F0'");
code = code.replace(/boxShadow:\s*'[^']+'/g, "borderWidth: 1, borderColor: '#E2E8F0'");

fs.writeFileSync(file, code);
console.log("Estoque shadows removed");
