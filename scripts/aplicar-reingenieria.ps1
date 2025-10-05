param(
  [string] = "feat/voice-handoff-snapshot"
)

\Continue = 'Stop'

function Step(\){ Write-Host "
[***] \" -ForegroundColor Cyan }
function Backup-And-Write(\, [string]\){
  \ = Split-Path -Parent \
  if(-not (Test-Path \)){ New-Item -ItemType Directory -Path \ | Out-Null }
  if(Test-Path \){
    \ = (Get-Date -Format 'yyyyMMdd-HHmmss')
    Copy-Item \ "\.bak-\"
  }
  \ | Set-Content -Path \ -Encoding UTF8
  Write-Host "  ↳ escrito: \" -ForegroundColor Green
}

Step "1) Safety tag + rama de trabajo"
git fetch --all --prune
git checkout -B \
\ = (Get-Date -Format 'yyyyMMdd-HHmm')
git tag "safety-\" -m "Punto de seguridad"
git push origin --tags

Step "2) featureFlags: usa .tsx (JSX) y keep existing flags"
# si existe .ts -> renombra a .tsx (no sobreescribe el contenido)
if(Test-Path "apps/web/src/services/featureFlags.ts" -and -not (Test-Path "apps/web/src/services/featureFlags.tsx")){
  Rename-Item "apps/web/src/services/featureFlags.ts" "featureFlags.tsx"
  Write-Host "  ↳ renombrado a featureFlags.tsx" -ForegroundColor Yellow
}
# si NO existe ninguno, crea uno mínimo compatible
if(-not (Test-Path "apps/web/src/services/featureFlags.tsx")){
  \ = @'
export const flags = {
  VOICE_NOTES: import.meta.env.VITE_FEATURE_VOICE_NOTES === "true",
  HANDOFF_PRO: import.meta.env.VITE_FEATURE_HANDOFF_PRO === "true",
  BCMA_PRO: import.meta.env.VITE_FEATURE_BCMA_PRO === "true",
} as const;

export function FeatureGate({ when, fallback = null, children }:{
  when: boolean; fallback?: React.ReactNode; children: React.ReactNode;
}){ return when ? <>{children}</> : <>{fallback}</>; }
'@
  Backup-And-Write "apps/web/src/services/featureFlags.tsx" \
}

Step "3) fhir.ts FUSIONADO (helpers + cliente ligero)"
\ = @'
/* apps/web/src/lib/fhir.ts — unificado */
export const FHIR_BASE: string = (import.meta as any).env?.VITE_FHIR_BASE_URL?.trim?.() || "";
export const hasFHIR: boolean = !!FHIR_BASE;

type Any = any;

async function http<T = Any>(path: string, init?: RequestInit): Promise<T> {
  if (!FHIR_BASE) throw new Error("VITE_FHIR_BASE_URL no configurado");
  const res = await fetch(${FHIR_BASE}, {
    ...init,
    headers: { "Content-Type":"application/fhir+json", ...(init?.headers||{}) }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(${res.status}: );
  }
  return res.json() as Promise<T>;
}

export const Fhir = {
  create: <T = Any>(type: string, body: Any) =>
    http<T>(/, { method: "POST", body: JSON.stringify(body) }),
  update: <T = Any>(type: string, id: string, body: Any) =>
    http<T>(//, { method: "PUT", body: JSON.stringify(body) }),
  read:   <T = Any>(type: string, id: string) => http<T>(//),
  search: <T = Any>(type: string, qs: string) => http<T>(/?),
  patch:  <T = Any>(type: string, id: string, ops: Any[]) =>
    http<T>(//, {
      method: "PATCH",
      headers: { "Content-Type": "application/json-patch+json" },
      body: JSON.stringify(ops),
    }),
  bundle: <T = Any>(bundle: Any) =>
    http<T>("", { method: "POST", body: JSON.stringify(bundle) }),
};

export function makeBundle(resources: Any[]) {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: resources.map((r) => ({
      fullUrl: r.id ? ${r.resourceType}/ : undefined,
      resource: r,
      request: {
        method: r.id ? "PUT" : "POST",
        url: r.id ? ${r.resourceType}/ : r.resourceType,
      },
    })),
  };
}

export async function ensurePatient(id: string, patch?: Any) {
  try {
    const p = await Fhir.read<Any>("Patient", id);
    if (patch) {
      if (Array.isArray(patch)) return Fhir.patch("Patient", id, patch);
      return Fhir.update("Patient", id, { ...p, ...patch });
    }
    return p;
  } catch {
    const body = {
      resourceType: "Patient",
      id, active: true,
      ...(patch || {}),
      name: (patch?.name || [{ text: id }]),
      meta: { tag: [{ system: "https://nurseos.dev/demo", code: "seed" }] },
    };
    return Fhir.update("Patient", id, body);
  }
}

export async function ensureEncounter(patientId: string) {
  const bundle = await Fhir.search<Any>(
    "Encounter",
    subject=Patient/&status=arrived,in-progress,triaged&_sort=-date&_count=1
  );
  const found = bundle?.entry?.[0]?.resource;
  if (found) return found;

  const id = nc-\;
  const enc = {
    resourceType: "Encounter", id, status: "in-progress",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "IMP", display: "inpatient encounter" },
    subject: { reference: Patient/ },
    period: { start: new Date().toISOString() },
  };
  return Fhir.update("Encounter", id, enc);
}

export async function ensureDevice(patientId: string, code = "dev-unknown", display = "Dispositivo"){
  const did = dev-\;
  let device: Any;
  try { device = await Fhir.read<Any>("Device", did); }
  catch {
    device = await Fhir.update<Any>("Device", did, {
      resourceType: "Device", id: did, status: "active",
      type: { coding: [{ system: "http://snomed.info/sct", code, display }] },
    });
  }
  const dusId = dus-\-\;
  const dus = await Fhir.update<Any>("DeviceUseStatement", dusId, {
    resourceType: "DeviceUseStatement", id: dusId, status: "active",
    subject: { reference: Patient/ },
    device: { reference: Device/ }, recordedOn: new Date().toISOString(),
  });
  return { device, use: dus };
}

export async function setDeceased(patientId: string, deceasedDateTime: string) {
  return Fhir.patch<Any>("Patient", patientId, [
    { op: "add", path: "/deceasedDateTime", value: deceasedDateTime },
  ]);
}

export async function postObservation(obs: Any){ return Fhir.create<Any>("Observation", obs); }

export async function savePatientDocument(patientId: string, kind: string, title: string, text: string) {
  const compId = comp-\-\;
  const comp = {
    resourceType: "Composition", id: compId, status: "final",
    type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }] },
    subject: { reference: Patient/ }, date: new Date().toISOString(), title,
    section: [{ title: kind, text: { status: "generated", div: <div>\</div> } }],
  };
  const doc = {
    resourceType: "DocumentReference", status: "current",
    type: { coding: [{ system: "http://loinc.org", code: "11506-3" }] },
    subject: { reference: Patient/ }, date: new Date().toISOString(),
    content: [{ attachment: { contentType: "text/markdown", data: btoa(text) } }],
  };
  const bundle = makeBundle([comp, doc]);
  return Fhir.bundle<Any>(bundle);
}

export { hasFHIR as hasFhir };
'@
Backup-And-Write "apps/web/src/lib/fhir.ts" \

Step "4) Voice components (sólo si faltan)"
if(-not (Test-Path "apps/web/src/components/voice/useSpeech.ts")){
  \ = @'
import { useEffect, useRef, useState } from "react";
export function useSpeech(){
  const [text,setText] = useState("");
  const [listening,setListening]=useState(false);
  const recRef = useRef<SpeechRecognition|null>(null);
  useEffect(()=>{ if(!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    const SR:any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const rec = new SR(); rec.continuous=true; rec.interimResults=true; rec.lang="es-ES";
    rec.onresult = (e:SpeechRecognitionEvent)=>{ let final=""; for(const r of e.results){ final+=r[0].transcript+" "; } setText(final.trim()); };
    rec.onend = ()=> setListening(false); recRef.current = rec;
  },[]);
  const start=()=>{ recRef.current?.start(); setListening(true); };
  const stop =()=>{ recRef.current?.stop(); };
  return { text, listening, start, stop, setText };
}
'@
  Backup-And-Write "apps/web/src/components/voice/useSpeech.ts" \
}
if(-not (Test-Path "apps/web/src/components/voice/MicButton.tsx")){
  \ = @'
import { useSpeech } from "./useSpeech";
export default function MicButton({onDone}:{onDone:(t:string)=>void}){
  const {text,listening,start,stop,setText}=useSpeech();
  return (
    <div className="flex items-center gap-2">
      <button onMouseDown={start} onMouseUp={()=>{stop(); onDone(text);}}
        className={\px-4 py-2 rounded-2xl shadow \\}>🎤 Mantener para hablar</button>
      <textarea value={text} onChange={e=>setText(e.target.value)} className="border p-2 rounded w-full" rows={3}/>
    </div>
  );
}
'@
  Backup-And-Write "apps/web/src/components/voice/MicButton.tsx" \
}

Step "5) Env types (si faltan)"
if(-not (Test-Path "apps/web/env.d.ts")){
  \ = @'
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_FHIR_BASE_URL:string
  readonly VITE_OIDC_AUTHORITY:string
  readonly VITE_OIDC_CLIENT_ID:string
  readonly VITE_OIDC_SCOPES:string
  readonly VITE_FEATURE_VOICE_NOTES:string
  readonly VITE_FEATURE_HANDOFF_PRO:string
  readonly VITE_FEATURE_BCMA_PRO:string
}
interface ImportMeta { readonly env: ImportMetaEnv }
'@
  Backup-And-Write "apps/web/env.d.ts" \
}

Step "6) Rewire import antiguos a /lib/fhir (no destructivo)"
# Reemplaza sólo si encuentra el patrón; crea backup por archivo
Get-ChildItem apps/web/src -Include *.ts,*.tsx -Recurse | ForEach-Object {
  \ = \.FullName
  \ = Get-Content \ -Raw
  \ = \
  \ = \ -replace 'from\\s+\"(\\.{1,2}/)?services/fhirClient\"', 'from \"\/fhir\"'
  if(\ -ne \){
    Copy-Item \ "\.bak-rewire"
    \ | Set-Content \ -Encoding UTF8
    Write-Host "  ↳ rewire: \" -ForegroundColor Yellow
  }
}

Step "7) Comprobación de marcadores de merge (<<<<<<<)"
\ = Select-String -Path apps/web/src -Pattern '<<<<<<<|=======|>>>>>>>' -SimpleMatch -List -ErrorAction SilentlyContinue
if(\){ Write-Warning "Hay conflictos sin resolver. Revísalos antes de continuar."; \ | ForEach-Object { Write-Host "  ↳ " \.Path ":" \.LineNumber } }

Step "8) Commit"
git add -A
git commit -m "chore(apply): fhir.ts unificado + flags .tsx + voice scaffolding (no destructivo)" | Out-Null
Write-Host "
Listo. Puedes ejecutar pnpm -C apps/web install && pnpm -C apps/web dev" -ForegroundColor Green
