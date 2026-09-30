const fs = require('fs');

const file = 'mobile/src/app/(tabs)/estoque.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/elevation:\s*4,\s*shadowColor:\s*color,\s*shadowOffset:\s*\{\s*width:\s*0,\s*height:\s*4\s*\},\s*shadowOpacity:\s*0\.3,\s*shadowRadius:\s*8/g, "boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)'");

code = code.replace(/shadowColor:\s*([^,]+),\s*shadowOffset:\s*\{\s*width:\s*\d+,\s*height:\s*(\d+)\s*\},\s*shadowOpacity:\s*([\d.]+),\s*shadowRadius:\s*(\d+),\s*elevation:\s*\d+/g, (match, color, h, o, r) => {
  return `boxShadow: \`0px ${h}px ${r}px \${${color}}\``;
});

fs.writeFileSync(file, code);
console.log("Shadows replaced");
