import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const file of readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.mjs')&&!f.includes('browser'))){
  const result=spawnSync(process.execPath,[path.join(root,'tests',file)],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
const python=spawnSync(process.env.PYTHON||'python3',['-c',`
import importlib.util,pathlib
count=0
for file in pathlib.Path('tests').glob('test_*.py'):
 spec=importlib.util.spec_from_file_location(file.stem,file);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 for name in dir(mod):
  if name.startswith('test_'):getattr(mod,name)();count+=1
print('Python contracts: PASS (%s tests)'%count)
`],{cwd:root,stdio:'inherit'});
if(python.status!==0)process.exit(python.status||1);
