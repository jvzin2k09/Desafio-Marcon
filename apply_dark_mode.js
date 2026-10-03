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

  // Fix multi-line inputs, th, and tr
  content = content.replace(/<input([^>]*?)className="([^"]*?)"/gs, (match, p1, p2) => {
    if (p2.includes('lg:bg-slate-800')) return match;
    return `<input${p1}className="${p2} lg:bg-slate-800/60 lg:border-slate-700 lg:text-white lg:placeholder-slate-400 focus:lg:border-blue-500"`;
  });

  content = content.replace(/<th([^>]*?)className="([^"]*?)"/gs, (match, p1, p2) => {
    if (p2.includes('lg:bg-slate-800')) return match;
    return `<th${p1}className="${p2} lg:bg-slate-800/80 lg:text-slate-300 lg:border-slate-700"`;
  });

  content = content.replace(/<tr([^>]*?)className="([^"]*?)hover:bg-slate-50([^"]*?)"/gs, (match, p1, p2, p3) => {
    if (match.includes('lg:border-slate-800')) return match;
    return `<tr${p1}className="${p2}hover:bg-slate-50 lg:border-b lg:border-slate-800/60 lg:text-slate-200 hover:lg:bg-white/5${p3}"`;
  });

  // Specifically for cards/containers that missed the previous regex because of line breaks or class order
  content = content.replace(/className="([^"]*?bg-white[^"]*?rounded-[a-zA-Z0-9]+[^"]*?)"/g, (match, p1) => {
    if (p1.includes('lg:bg-slate-900')) return match;
    return `className="${p1} lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200"`;
  });

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed multiline', file);
});
