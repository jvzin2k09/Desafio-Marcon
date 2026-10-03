const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src', 'app', '(dashboard)');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (file === 'page.js') {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(baseDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix hover states on table rows or buttons that turn white on hover
  content = content.replace(/hover:bg-slate-50(?!\s*lg:|[\w-])/g, 'hover:bg-slate-50 hover:lg:bg-white/5');
  content = content.replace(/hover:bg-slate-100(?!\s*lg:|[\w-])/g, 'hover:bg-slate-100 hover:lg:bg-white/10');
  
  // Specific table row hovers in painel-estoque
  content = content.replace(/hover:bg-red-100\/60(?!\s*lg:|[\w-])/g, 'hover:bg-red-100/60 hover:lg:bg-red-900/40');
  content = content.replace(/hover:bg-amber-100\/50(?!\s*lg:|[\w-])/g, 'hover:bg-amber-100/50 hover:lg:bg-amber-900/40');
  content = content.replace(/bg-red-50\/70(?!\s*lg:|[\w-])/g, 'bg-red-50/70 lg:bg-red-950/40');
  content = content.replace(/bg-amber-50\/60(?!\s*lg:|[\w-])/g, 'bg-amber-50/60 lg:bg-amber-950/40');

  // Any remaining 'bg-white' in className that are card-like containers, e.g. 'bg-white border'
  content = content.replace(/className="([^"]*?\bbg-white\b[^"]*?)"/g, (match, p1) => {
    if (p1.includes('lg:bg-slate-900') || p1.includes('lg:bg-transparent') || p1.includes('lg:bg-slate-700') || p1.includes('lg:bg-slate-800')) {
      return match;
    }
    // Only apply to main layout containers (padding, borders, shadow)
    if (p1.includes('rounded-') || p1.includes('p-4') || p1.includes('shadow-sm')) {
      return `className="${p1} lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200"`;
    }
    return match;
  });
  
  // Also specific for the filter bar in historico which was missed (it's exactly this:)
  content = content.replace(/bg-white border border-slate-100 shadow-sm/g, 'bg-white border border-slate-100 shadow-sm lg:bg-slate-900/80 lg:backdrop-blur-md lg:border-slate-800/80 lg:shadow-xl');

  fs.writeFileSync(file, content, 'utf8');
});
console.log("Hovers and remaining white blocks fixed.");
