type Json = any;

const modules = import.meta.glob('./definitions/*.json', { eager: true, import: 'default' }) as Record<string, Json>;
const byName: Record<string, Json> = {};
for (const path in modules) {
  const name = path.split('/').pop()!.replace('.json','').toLowerCase();
  byName[name] = modules[path];
}

export function listScales(){ return Object.keys(byName).sort(); }
export function getScale(name: string){
  const def = byName[name.toLowerCase()];
  if(!def) throw new Error(`Scale not found: ${name}`);
  return def;
}
