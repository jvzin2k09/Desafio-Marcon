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
  let changed = false;

  // ITEM 1: All generic hover:bg-slate-50 -> add hover:lg:bg-slate-800/60 (dark hover) 
  // but NOT where we already have a specific hover:lg: class
  const before = content;
  
  // Replace hover:bg-slate-50 that DON'T already have hover:lg: nearby
  content = content.replace(/hover:bg-slate-50(?!\s+hover:lg:)/g, (match, offset) => {
    // Check if there's already a hover:lg: within 100 chars after this match
    const after = content.substring(offset, offset + 200);
    if (after.includes('hover:lg:bg-')) return match; // Already has dark hover
    return 'hover:bg-slate-50 hover:lg:bg-slate-800/60';
  });
  
  // Also hover:bg-slate-100
  content = content.replace(/hover:bg-slate-100(?!\s+hover:lg:)/g, (match, offset) => {
    const after = content.substring(offset, offset + 200);
    if (after.includes('hover:lg:bg-')) return match;
    return 'hover:bg-slate-100 hover:lg:bg-slate-800/60';
  });
  
  // hover:bg-slate-200
  content = content.replace(/hover:bg-slate-200(?!\s+hover:lg:)/g, (match, offset) => {
    const after = content.substring(offset, offset + 200);
    if (after.includes('hover:lg:bg-')) return match;
    return 'hover:bg-slate-200 hover:lg:bg-slate-800/60';
  });

  // hover:bg-slate-200/60
  content = content.replace(/hover:bg-slate-200\/60(?!\s+hover:lg:)/g, (match, offset) => {
    const after = content.substring(offset, offset + 200);
    if (after.includes('hover:lg:bg-')) return match;
    return 'hover:bg-slate-200/60 hover:lg:bg-slate-700/60';
  });
  
  // Remove duplicate classes that might have been introduced
  content = content.replace(/(hover:lg:bg-slate-800\/60\s*){2,}/g, 'hover:lg:bg-slate-800/60 ');

  if (content !== before) changed = true;

  fs.writeFileSync(file, content, 'utf8');
  if (changed) console.log('Fixed global hovers in', path.basename(path.dirname(file)));
});
console.log("Done.");
