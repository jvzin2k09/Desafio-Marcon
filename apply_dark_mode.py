import os, glob, re

base_dir = r'c:\Projetos\Marcon(certo)\Desafio-Marcon\src\app\(dashboard)'

for root, _, files in os.walk(base_dir):
    for f in files:
        if f == 'page.js':
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Avoid applying if already applied to prevent bloat (just a simple check)
            if "lg:text-white" in content and "lg:bg-slate-900/80" in content:
                continue

            # 1. Main Titles & Descriptions
            content = re.sub(r'text-slate-800', r'text-slate-800 lg:text-white', content)
            content = re.sub(r'text-slate-500', r'text-slate-500 lg:text-slate-400', content)
            
            # 2. Cards/Panels
            content = re.sub(r'bg-white rounded-([^\" ]+)', r'bg-white lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 rounded-\1', content)
            
            # 3. Input Fields
            content = re.sub(r'<input([^>]*?)className=\"([^\"]*?)\"', r'<input\1className="\2 lg:bg-slate-800/60 lg:border-slate-700 lg:text-white lg:placeholder-slate-400 focus:lg:border-blue-500"', content)
            
            # 4. Table headers
            content = re.sub(r'<th([^>]*?)className=\"([^\"]*?)\"', r'<th\1className="\2 lg:bg-slate-800/80 lg:text-slate-300 lg:border-slate-700"', content)
            
            # 5. Table rows (tr in tbody usually have hover:bg-slate-50)
            content = re.sub(r'<tr([^>]*?)className=\"([^\"]*?)hover:bg-slate-50([^\"]*?)\"', r'<tr\1className="\2hover:bg-slate-50 lg:border-slate-800/60 lg:text-slate-200 hover:lg:bg-white/5\3"', content)
            
            # 6. Buttons & Filters 
            # Inactive
            content = re.sub(r'bg-white border text-slate-700 hover:bg-slate-50', r'bg-white border text-slate-700 hover:bg-slate-50 lg:bg-slate-800/40 lg:text-slate-300 lg:border-slate-700/50 hover:lg:bg-slate-800', content)
            # Active (already blue but let's make sure it has lg:text-white)
            # if we see text-white we can leave it

            with open(path, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f"Updated {path}")
