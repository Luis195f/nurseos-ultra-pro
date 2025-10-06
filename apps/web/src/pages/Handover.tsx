// apps/web/src/pages/Handover.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { listPatients, listDevices, savePatientDocument, DEVICES } from "../lib/fhir-compat";
// IMPORTA el botón de voz (usa ruta relativa para no depender de alias "@")
import MicButton from "../components/voice/MicButton";

type Turno = "dia" | "noche";
type Target = "evolucion" | "meds" | "plan" | "pendientes";

const asArray = <T,>(v: unknown, fallback: T[] = []): T[] =>
  Array.isArray(v) ? (v as T[]) : fallback;

function defaultWindow(t: Turno) {
  return t === "dia" ? { start: "07:00", end: "19:00" } : { start: "19:00", end: "07:00" };
}

const PRESETS: Array<{ label: string; target: Target; text: string }> = [
  { label: "Orientado x3",               target: "evolucion",  text: "Paciente orientado en persona, lugar y tiempo. Glasgow 15/15." },
  { label: "Dolor controlado",           target: "evolucion",  text: "Dolor controlado con esquema vigente, EVA ≤3." },
  { label: "Sin eventos agudos",         target: "evolucion",  text: "Sin eventos clínicos relevantes en la ventana del turno." },
  { label: "ATB ajustado",               target: "meds",       text: "Ajuste antibiótico realizado según última sensibilidad." },
  { label: "Insulina SC PRN",            target: "meds",       text: "Insulina subcutánea según esquema PRN/DM." },
  { label: "Vía periférica ok",          target: "plan",       text: "Vía periférica permeable y fijación íntegra." },
  { label: "Herida limpia/seca",         target: "plan",       text: "Herida quirúrgica limpia y seca, sin signos de infección." },
  { label: "Pendientes de control",      target: "pendientes", text: "Control de signos 20:00; balance hídrico cada 4 h; curación a las 22:00." },
];

const groupPresets = (target: Target) => PRESETS.filter(p => p.target === target);

export default function Handover() {
  // ---- Estado base
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string>("");
  const [devices, setDevices] = useState<string[]>([]);

  const [turno, setTurno] = useState<Turno>("dia");
  const { start, end } = useMemo(() => defaultWindow(turno), [turno]);

  const [evolucion, setEvolucion]   = useState("");
  const [meds, setMeds]             = useState("");
  const [plan, setPlan]             = useState("");
  const [pendientes, setPendientes] = useState("");

  // ---- KPIs
  const startRef = useRef<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [presetsUsed, setPresetsUsed] = useState(0);
  const [voiceChars, setVoiceChars] = useState(0); // total chars dictados (todas las áreas)

  useEffect(() => {
    const t = setInterval(() => setElapsedMs(Date.now() - startRef.current), 10000);
    return () => clearInterval(t);
  }, []);

  const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
  const totalWords = words(evolucion) + words(meds) + words(plan) + words(pendientes);
  const voiceWords = Math.round(voiceChars / 5); // ~5 chars por palabra
  const savedMinutes = Math.max(0, Math.round(voiceWords * (1 / 35 - 1 / 120) * 60 * 10) / 10); // 35 wpm tecleo vs 120 wpm voz

  // ---- Draft key
  const draftKey = useMemo(
    () => (patientId ? `nurseos/handover/draft/${patientId}/${turno}` : ""),
    [patientId, turno]
  );

  // ---- Carga pacientes
  useEffect(() => {
    (async () => {
      try {
        const resp: any = await listPatients();
        const arr = Array.isArray(resp) ? resp : asArray(resp?.patients, []);
        setPatients(arr);
      } catch (e: any) {
        toast.error(`No se pudieron cargar pacientes: ${e?.message || e}`);
      }
    })();
  }, []);

  // ---- Cambio de paciente/turno
  useEffect(() => {
    (async () => {
      try {
        if (patientId) {
          const d = await (listDevices as any)(patientId);
          setDevices(asArray<string>(d, []));
          const raw = draftKey ? localStorage.getItem(draftKey) : null;
          if (raw) {
            try {
              const draft = JSON.parse(raw);
              setEvolucion(draft.evolucion ?? "");
              setMeds(draft.meds ?? "");
              setPlan(draft.plan ?? "");
              setPendientes(draft.pendientes ?? "");
            } catch { setEvolucion(""); setMeds(""); setPlan(""); setPendientes(""); }
          } else {
            setEvolucion(""); setMeds(""); setPlan(""); setPendientes("");
          }
        } else {
          setDevices([]);
          setEvolucion(""); setMeds(""); setPlan(""); setPendientes("");
        }
      } catch (e: any) {
        toast.error(`No se pudieron cargar dispositivos: ${e?.message || e}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, turno]);

  // ---- Autosave
  useEffect(() => {
    if (!draftKey) return;
    const data = { evolucion, meds, plan, pendientes };
    localStorage.setItem(draftKey, JSON.stringify(data));
  }, [draftKey, evolucion, meds, plan, pendientes]);

  // ---- Safe collections
  const patientsSafe = asArray<any>(patients, []);
  const devicesSafe  = asArray<string>(devices, []);
  const selected = useMemo(() => patientsSafe.find(p => p.id === patientId), [patientsSafe, patientId]);

  // ---- Helpers UI
  const fullName = (p: any) =>
    ((p?.name?.[0]?.given?.join(" ") || "") + " " + (p?.name?.[0]?.family || "")).trim() || p?.name || "—";

  function appendTo(target: Target, text: string) {
    if (!text?.trim()) return;
    setPresetsUsed(c => c + 1);
    if (target === "evolucion")  setEvolucion(v => (v ? v + "\n" : "") + text);
    if (target === "meds")       setMeds(v      => (v ? v + "\n" : "") + text);
    if (target === "plan")       setPlan(v      => (v ? v + "\n" : "") + text);
    if (target === "pendientes") setPendientes(v=> (v ? v + "\n" : "") + text);
  }

  function buildText() {
    const p = selected ?? {};
    const { start, end } = defaultWindow(turno);
    return `ENTREGA DE TURNO (${turno === "dia" ? "DÍA" : "NOCHE"}) 12h
Paciente: ${fullName(p)}  |  Sexo: ${p.gender || ""}  |  Nac.: ${p.birthDate || ""}
ID: ${p.id || p.identifier?.[0]?.value || ""}

Dispositivos activos: ${devicesSafe.length ? devicesSafe.join(", ") : "ninguno"}

Evolución/Hechos relevantes:
${evolucion || "-"}

Cambios de medicación:
${meds || "-"}

Plan de cuidados / objetivos:
${plan || "-"}

Pendientes para el siguiente turno:
${pendientes || "-"}

Ventana: ${start} → ${end}
(Generado en NurseOS — revisión humana obligatoria)`;
  }

  async function onSave() {
    if (!patientId) { toast.error("Selecciona paciente"); return; }
    try {
      await (savePatientDocument as any)({ patientId, content: buildText(), categoryCode: "handover" });
      toast.success("Entrega guardada en historial del paciente");
      if (draftKey) localStorage.removeItem(draftKey);
      setEvolucion(""); setMeds(""); setPlan(""); setPendientes("");
    } catch (e1: any) {
      try {
        await (savePatientDocument as any)(patientId, "handover", `Entrega ${turno}`, buildText());
        toast.success("Entrega guardada en historial del paciente");
        if (draftKey) localStorage.removeItem(draftKey);
        setEvolucion(""); setMeds(""); setPlan(""); setPendientes("");
      } catch (e2: any) {
        toast.error(`No se pudo guardar: ${e2?.message || e2}`);
      }
    }
  }

  async function copyToClipboard() {
    try { await navigator.clipboard.writeText(buildText()); toast("Texto copiado"); }
    catch { toast.error("No se pudo copiar"); }
  }

  // ---- UI
  const kpi = {
    tiempo: `${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s`,
    palabras: totalWords,
    dictadas: voiceWords,
    ahorro: savedMinutes,        // min
    dispositivos: devicesSafe.length,
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between gap-4 mb-4">
        <h1 className="text-3xl font-bold">Entrega de Turno (12 h)</h1>
        {/* KPIs */}
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          <div className="bg-white border rounded-lg p-2"><div className="text-neutral-500">Tiempo</div><div className="font-semibold">{kpi.tiempo}</div></div>
          <div className="bg-white border rounded-lg p-2"><div className="text-neutral-500">Palabras</div><div className="font-semibold">{kpi.palabras}</div></div>
          <div className="bg-white border rounded-lg p-2"><div className="text-neutral-500">Dictadas</div><div className="font-semibold">{kpi.dictadas}</div></div>
          <div className="bg-white border rounded-lg p-2"><div className="text-neutral-500">Ahorro (min)</div><div className="font-semibold">{kpi.ahorro}</div></div>
          <div className="bg-white border rounded-lg p-2"><div className="text-neutral-500">Dispositivos</div><div className="font-semibold">{kpi.dispositivos}</div></div>
        </div>
      </div>

      {/* Filtros principales */}
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border rounded-lg p-3">
          <div className="text-sm text-neutral-500 mb-1">Paciente</div>
          <select value={patientId} onChange={(e)=>setPatientId(e.target.value)} className="w-full border rounded p-2">
            <option value="">— Selecciona —</option>
            {patientsSafe.map((p) => (
              <option key={p.id} value={p.id}>{fullName(p)} ({p.id})</option>
            ))}
          </select>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="text-sm text-neutral-500 mb-1">Turno</div>
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 rounded border ${turno === "dia" ? "bg-emerald-600 text-white" : ""}`}
              onClick={() => setTurno("dia")}
              disabled={turno === "dia"}
            >Día (07–19)</button>
            <button
              className={`px-3 py-2 rounded border ${turno === "noche" ? "bg-indigo-600 text-white" : ""}`}
              onClick={() => setTurno("noche")}
              disabled={turno === "noche"}
            >Noche (19–07)</button>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="font-semibold mb-1">Dispositivos</div>
          <div className="text-sm">{devicesSafe.length ? devicesSafe.join(", ") : "ninguno"}</div>
          <div className="text-xs text-neutral-500 mt-1">Ventana {start} → {end}</div>
        </div>
      </div>

      {/* Atajos por categoría */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div className="bg-white border rounded-lg p-3">
          <div className="font-semibold mb-2">Atajos — Evolución</div>
          <div className="flex flex-wrap gap-2">
            {groupPresets("evolucion").map(p => (
              <button key={p.label} className="px-3 py-1.5 rounded-full border text-sm" onClick={()=>appendTo("evolucion", p.text)}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="font-semibold mb-2">Atajos — Medicación</div>
          <div className="flex flex-wrap gap-2">
            {groupPresets("meds").map(p => (
              <button key={p.label} className="px-3 py-1.5 rounded-full border text-sm" onClick={()=>appendTo("meds", p.text)}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="font-semibold mb-2">Atajos — Plan</div>
          <div className="flex flex-wrap gap-2">
            {groupPresets("plan").map(p => (
              <button key={p.label} className="px-3 py-1.5 rounded-full border text-sm" onClick={()=>appendTo("plan", p.text)}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="font-semibold mb-2">Atajos — Pendientes</div>
          <div className="flex flex-wrap gap-2">
            {groupPresets("pendientes").map(p => (
              <button key={p.label} className="px-3 py-1.5 rounded-full border text-sm" onClick={()=>appendTo("pendientes", p.text)}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Áreas con micrófono */}
      <div className="grid md:grid-cols-2 gap-3">
        <label className="bg-white border rounded-lg p-3 grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Evolución / hechos relevantes</span>
            <MicButton
              labelIdle="Dictar"
              labelListening="Grabando…"
              onResult={(txt) => { setEvolucion(v => (v ? v + "\n" : "") + txt); setVoiceChars(c => c + txt.length); }}
              size="sm"
            />
          </div>
          <textarea rows={6} value={evolucion} onChange={(e)=>setEvolucion(e.target.value)} className="w-full border rounded p-2" />
        </label>

        <label className="bg-white border rounded-lg p-3 grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Cambios de medicación</span>
            <MicButton
              labelIdle="Dictar"
              labelListening="Grabando…"
              onResult={(txt) => { setMeds(v => (v ? v + "\n" : "") + txt); setVoiceChars(c => c + txt.length); }}
              size="sm"
            />
          </div>
          <textarea rows={6} value={meds} onChange={(e)=>setMeds(e.target.value)} className="w-full border rounded p-2" />
        </label>

        <label className="bg-white border rounded-lg p-3 grid gap-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Plan / objetivos</span>
            <MicButton
              labelIdle="Dictar"
              labelListening="Grabando…"
              onResult={(txt) => { setPlan(v => (v ? v + "\n" : "") + txt); setVoiceChars(c => c + txt.length); }}
              size="sm"
            />
          </div>
          <textarea rows={4} value={plan} onChange={(e)=>setPlan(e.target.value)} className="w-full border rounded p-2" />
          {!!DEVICES?.length && (
            <div className="text-sm text-neutral-500">
              Sugerencias de dispositivos: {DEVICES.slice(0, 6).join(", ")}
            </div>
          )}
        </label>

        <label className="bg-white border rounded-lg p-3 grid gap-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Pendientes para el siguiente turno</span>
            <MicButton
              labelIdle="Dictar"
              labelListening="Grabando…"
              onResult={(txt) => { setPendientes(v => (v ? v + "\n" : "") + txt); setVoiceChars(c => c + txt.length); }}
              size="sm"
            />
          </div>
          <textarea rows={4} value={pendientes} onChange={(e)=>setPendientes(e.target.value)} className="w-full border rounded p-2" />
        </label>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={onSave}>Guardar en historial</button>
        <button className="px-4 py-2 rounded border" onClick={copyToClipboard}>Copiar texto</button>
        <div className="ml-auto text-sm text-neutral-500 self-center">Presets usados: {presetsUsed}</div>
      </div>
    </div>
  );
}


