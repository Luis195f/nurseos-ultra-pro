import { openDB } from 'idb';
const DB_NAME = 'nurseos'; const STORE = 'drafts';
export async function db(){ return openDB(DB_NAME,1,{upgrade(db){ db.createObjectStore(STORE); }}); }
export async function putDraft(key:string, val:any){ (await db()).put(STORE, val, key); }
export async function getDraft<T=any>(key:string){ return (await db()).get(STORE, key) as Promise<T|undefined>; }
export async function delDraft(key:string){ (await db()).delete(STORE, key); }