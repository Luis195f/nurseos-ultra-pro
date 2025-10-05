// apps/web/src/pages/CodeBlue.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { FeatureGate, flags } from "../services/featureFlags";
// Usa la fachada que siempre expone Fhir
import { Fhir } from "../lib/fhir";
// auditoría opcional; si no existe, no rompe
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as AuditSvc from "../services/audit";

type RoleKey = "leader" | "compressions" | "airway" | "meds" | "scribe";
type Role = { key: RoleKey; label: string; who: string };

type EventBase = { t: number; label: string };
type MedEvent = EventBase & { kind: "med"; med: string; dose: string; route: string };
type ObsEvent = EventBase & { kind: "obs"; code: string; value: string; unit?: string };
type NoteEvent = EventBase & { kind: "note" };
type CodeEvent = MedEvent | ObsEvent | NoteEvent;

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function CodeBlue() {
  // Paciente “rápido” (en real vendrá del contexto/route param)
  const patientId = useMemo(() => "P" + Date.now().toString().slice(-6), []);
  const [running, setRunning] = useState(false);
  const startAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let h: number;
    if (running) {
      const tick = () => {
        if (startAtRef.current != null) setElapsed(Date.now() - startAtRef.current);
        h = window.setTimeout(tick, 250);
      };
      h = window.setTimeout(tick, 250);
    }
    return () => clearTimeout(h);
  }, [running]);

  const [roles, setRoles] = useState<Role[]>([
    { key: "leader",       label: "Líder",            who: "" },
    { key: "compressions", label: "Compresiones",     who: "" },
    { key: "airway",       label: "Vía aérea",        who: "" },
    { key: "meds",         label: "Medicación",       who: "" },
    { key: "scribe",       label: "Registro",         who: "" },
  ]);

  const [events, setEvents] = useState<CodeEvent[]>([]);
  const nowT = () => (startAtRef.current ? Date.now() - startAtRef.current : 0);

  function addMed(med: string, dose: string, route: string) {
    setEvents((ev) => [...ev, { kind: "med", t: nowT(), label: `${med} ${dose} ${route}`, med, dose, route }]);
  }
  function addObs(code: string, value: string, unit?: string) {
    setEvents((ev) => [...ev, { kind: "obs", t: nowT(), label: `${code} ${value}${unit ? " " + unit : ""}`, code, value, unit }]);
  }
  function addNote(label: string) {
    setEvents((ev) => [...ev, { kind: "note", t: nowT(), label }]);
  }

  function start() {
    startAtRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  }
  function stop() { setRunning(false); }
  function reset() {
    setRunning(false);
    startAtRef.current = null;
    setElapsed(0);
    setEvents([]);
  }

  async function exportFHIR() {
    const baseDate = new Date().toISOString();
    const entry: any[] = [];

    const compSections: any[] = [
      { title: "Roles", text: { status: "generated", div: `<div>${roles.map(r => `${r.label}: ${r.who || "-"}`).join("<br/>")}</div>` } },
      { title: "Cronología", text: { status: "generated", div: `<div>${events.map(e => `[${fmt(e.t)}] ${e.label}`).join("<br/>")}</div>` } }
    ];

    for (const e of events) {
      if (e.kind === "med") {
        entry.push({
          resource: {
            resourceType: "MedicationAdministration",
            status: "completed",
            subject: { reference: `Patient/${patientId}` },
            effectiveDateTime: baseDate,
            medicationCodeableConcept: { text: e.med },
            dosage: { text: `${e.dose} ${e.route}` }
          },
          request: { method: "POST", url: "MedicationAdministration" }
        });
      } else if (e.kind === "obs") {
        entry.push({
          resource: {
            resourceType: "Observation",
            status: "final",
            subject: { reference: `Patient/${patientId}` },
            effectiveDateTime: baseDate,
            code: { text: e.code },
            valueQuantity: isNaN(Number(e.value))
              ? undefined
              : { value: Number(e.value), unit: e.unit || "" },
            valueString: isNaN(Number(e.value)) ? String(e.value) : undefined
          },
          request: { method: "POST", url: "Observation" }
        });
      }
    }

    const composition = {
      resourceType: "Composition",
      status: "final",
      type: { text: "Código Azul" },
      title: "Código Azul — Registro",
      date: baseDate,
      subject: { reference: `Patient/${patientId}` },
      section: compSections
    };

    entry.push({ resource: composition, request: { method: "POST", url: "Composition" } });

    const bundle = { resourceType: "Bundle", type: "transaction", entry };

    try {
      await Fhir.bundle(bundle);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (AuditSvc as any)?.log?.("code-blue.export", { patientId, events: events.length });
      } catch {}
      alert("✅ Código Azul exportado a FHIR");
    } catch (e) {
      console.error(e);
      localStorage.setItem(`nurseos/code-blue/${patientId}/${Date.now()}`, JSON.stringify(bundle));
      alert("⚠️ Offline: guardado local (Bundle). Se sincroniza luego.");
    }
  }

  return (
    <FeatureGate when={true} fallback={<div className="p-4">Código Azul PRO desactivado.</div>}>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Código Azul PRO</h1>

        {/* Timer */}
        <div className="flex items-center gap-3">
          <div className="text-3xl tabular-nums">{fmt(elapsed)}</div>
          {!running ? (
            <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={start}>Iniciar</button>
          ) : (
            <button className="px-3 py-2 rounded bg-amber-600 text-white" onClick={stop}>Pausar</button>
          )}
          <button className="px-3 py-2 rounded bg-neutral-200" onClick={reset}>Reiniciar</button>
        </div>

        {/* Roles */}
        <div className="bg-white border rounded-lg p-3">
          <h2 className="font-semibold mb-2">Roles</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {roles.map((r, i) => (
              <label key={r.key} className="flex items-center gap-2">
                <span className="w-32">{r.label}</span>
                <input
                  className="border rounded p-1 flex-1"
                  placeholder="Nombre / quién"
                  value={r.who}
                  onChange={(e) => setRoles(rs => rs.map((x, k) => k === i ? { ...x, who: e.target.value } : x))}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white border rounded-lg p-3 space-y-2">
          <h2 className="font-semibold">Acciones rápidas</h2>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={() => addMed("Adrenalina", "1 mg", "IV")}>Adrenalina 1 mg IV</button>
            <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={() => addMed("Amiodarona", "300 mg", "IV")}>Amiodarona 300 mg IV</button>
            <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={() => addObs("Ritmo", "FV/TV")}>Ritmo: FV/TV</button>
            <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={() => addObs("Ritmo", "AESP/Asistolia")}>Ritmo: AESP/Asistolia</button>
            <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={() => addObs("EtCO₂", "18", "mmHg")}>EtCO₂ 18 mmHg</button>
            <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={() => addNote("Cambio de reanimador")}>Cambio de reanimador</button>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border rounded-lg p-3">
          <h2 className="font-semibold mb-2">Cronología</h2>
          <ol className="list-decimal pl-5 space-y-1">
            {events.map((e, i) => (
              <li key={i} className="tabular-nums">
                <span className="text-neutral-500 mr-2">[{fmt(e.t)}]</span>{e.label}
              </li>
            ))}
            {events.length === 0 && <p className="text-neutral-500">Sin eventos todavía.</p>}
          </ol>
        </div>

        {/* Export */}
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-teal-700 text-white" onClick={exportFHIR}>Exportar PDF/Bundle FHIR (mínimo Bundle)</button>
        </div>
      </div>
    </FeatureGate>
  );
}




