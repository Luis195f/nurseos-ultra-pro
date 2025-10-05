<<<<<<< HEAD
/* store.ts – compat util para localStorage + memoria */
type Json = any;
const isBrowser = typeof window !== "undefined";
const mem = new Map<string,string>();
=======
type Json = any;
const isBrowser = typeof window !== "undefined";
const mem = new Map<string, string>();
>>>>>>> wip/snapshot-20251005-0909

export function getItem(k:string){ try{ return isBrowser? window.localStorage.getItem(k): (mem.get(k)??null);}catch{ return mem.get(k)??null; } }
export function setItem(k:string,v:string){ try{ if(isBrowser){ window.localStorage.setItem(k,v); return;} }catch{} mem.set(k,v); }
export function removeItem(k:string){ try{ if(isBrowser){ window.localStorage.removeItem(k); return;} }catch{} mem.delete(k); }

export function load<T=Json>(k:string, fb?:T):T{
  const raw=getItem(k); if(raw==null) return fb as T;
<<<<<<< HEAD
  try{ return JSON.parse(raw) as T; } catch { return (raw as unknown) as T; }
}
export function save<T=Json>(k:string, v:T){
  const raw=typeof v==="string"? v: JSON.stringify(v);
  setItem(k,raw);
}
export function update<T=Json>(k:string, m:(p:T|undefined)=>T){
  const p=load<T|undefined>(k,undefined); const n=m(p); save(k,n); return n;
}

/** Claves usadas en pantallas (alias de compat) */
export const key = {
  handover: "handover:last",
  devices: "registry:devices",
  registryOpts: "registry:opts",
  deceased: "deceased:last",
} as const;

/** Alias para imports antiguos */
export const STORE_KEYS = key;

export default { load, save, update, getItem, setItem, removeItem, key, STORE_KEYS };
=======
  try{ return JSON.parse(raw) as T; }catch{ return (raw as unknown) as T; }
}
export function save<T=Json>(k:string, v:T){
  const raw = typeof v==="string"? v : JSON.stringify(v);
  setItem(k, raw);
}
export function update<T=Json>(k:string, m:(p:T|undefined)=>T){
  const p=load<T|undefined>(k, undefined); const n=m(p); save(k, n); return n;
}

export default { load, save, update, getItem, setItem, removeItem };
>>>>>>> wip/snapshot-20251005-0909
