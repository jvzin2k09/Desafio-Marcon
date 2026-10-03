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

  // Active tabs that became white-on-white:
  // "bg-white text-slate-800 lg:text-white" or similar active states
  content = content.replace(/bg-white text-slate-800 lg:text-white/g, 'bg-white text-slate-800 lg:bg-slate-700 lg:text-white');
  content = content.replace(/bg-white text-slate-900 shadow-card/g, 'bg-white text-slate-900 lg:bg-slate-700 lg:text-white shadow-card');

  // Specific badges in estoque-alternativo / histórico with hardcoded light hex colors:
  content = content.replace(/bg-\[\#f0f4fb\] border border-\[\#d0dbe9\]/g, 'bg-[#f0f4fb] lg:bg-blue-900/40 border border-[#d0dbe9] lg:border-blue-800/50');
  
  content = content.replace(/bg-\[\#e8edf5\] text-\[\#1B3A6B\] lg:text-blue-400 border border-\[\#1B3A6B\]\/20/g, 'bg-[#e8edf5] lg:bg-blue-600 text-[#1B3A6B] lg:text-white border border-[#1B3A6B]/20 lg:border-transparent');
  content = content.replace(/bg-\[\#e8edf5\] text-\[\#1B3A6B\] border border-\[\#1B3A6B\]\/20/g, 'bg-[#e8edf5] lg:bg-blue-600 text-[#1B3A6B] lg:text-white border border-[#1B3A6B]/20 lg:border-transparent');

  // Fix any remaining bg-gray-100 / bg-slate-100 badge backgrounds to be dark on lg
  content = content.replace(/bg-gray-100 text-gray-500 border border-gray-200/g, 'bg-gray-100 lg:bg-slate-800 text-gray-500 lg:text-slate-400 border border-gray-200 lg:border-slate-700');

  // Fix input that might be invisible due to bg-white
  content = content.replace(/bg-white border-2 border-slate-200/g, 'bg-white border-2 border-slate-200 lg:bg-slate-900/80 lg:border-slate-700 lg:text-slate-100');

  fs.writeFileSync(file, content, 'utf8');
});
console.log("Contrasts fully repaired.");
