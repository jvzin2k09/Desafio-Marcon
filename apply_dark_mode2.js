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

  // Text color overrides for main titles and icons that were missed
  content = content.replace(/text-slate-900(?! lg:text-white)/g, 'text-slate-900 lg:text-white');
  content = content.replace(/text-\[\#1B3A6B\](?! lg:text-blue-400)/g, 'text-[#1B3A6B] lg:text-blue-400');
  
  // Tab container bg-slate-100
  content = content.replace(/bg-slate-100(?! lg:bg-slate-800)/g, 'bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50');
  
  // Inner cards / Badges bg-slate-50
  content = content.replace(/bg-slate-50(?! lg:border-slate-800)/g, 'bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200');

  // Any stray text-slate-700 that became invisible
  content = content.replace(/text-slate-700(?! lg:text-slate-300)/g, 'text-slate-700 lg:text-slate-300');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed additional contrasts in', file);
});
