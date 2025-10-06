// apps/web/src/pages/Handover.tsx
import { useEffect, useMemo, useState } from "react";
import { listPatients, listDevices, savePatientDocument } from "../services/fhirClient";
import MultiAgentAssist from "../components/MultiAgentAssist";
import { FeatureGate, flags } from "../services/featureFlags";
import MicButton from "../components/voice/MicButton";

type Turno = "dia" | "noche";
const unitList = ["Urgencias","UCI","Medicina Interna","Quirófano","Traumatología","Oncología","Pediatría","Neonatos","Cardiología","Neurología"];

function defaultWindow(turno: Turno) {
  const now = new Date();
  const d = new Date(now);
  if (turno === "dia") { d.setHours(7,0,0,0); }
  else { d.setHours(19,0,0,0); }
  const start = d.toISOString().slice(0,16);
  const end = new Date(d.getTime() + 12*60*60*1000).toISOString().slice(0,16);
  return { start, end };
}

export default function Handover(){
  // === Tu estado original ===
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string>("");
  const [devices, setDevices] = useState<string[]>([]);
  const [turno, setTurno] = useState<Turno>("dia");
  const { start, end } = useMemo(()=>defaultWindow(turno), [turno]);

  const [evolucion, setEvolucion] = useState("");
  const [meds, setMeds] = useState("");
  const [plan, setPlan] = useState("");
  const [pendientes, setPendientes] = useState("");

  // === Datos (igual que lo tuyo) ===
  useEffect(() => { (async()=>{
    const { patients } = await listPatients();
    setPatients(patients);
  })(); }, []);

  useEffect(() => { (async()=>{
    if (patientId) setDevices(await listDevices(patientId));
    else setDevices([]);
  })(); }, [patientId]);

  const selected = useMemo(()=>patients.find(p=>p.id===patientId), [patients, patientId]);
  const fullName = (p:any) => ((p?.name?.[0]?.given?.join(" ") || "") + " " + (p?.name?.[0]?.family || "")).trim();

  // === Macros 1-click (no invasivas) ===
  type Target = "evolucion" | "meds" | "plan" | "pendientes";
  const macros: Array<{label:string; target:Target; text:string}> = [
    { label:"Sin cambios relevantes", target:"evolucion", text:"Sin cambios relevantes en el turno." },
    { label:"Dolor controlado",       target:"evolucion", text:"Dolor controlado con analgesia pautada." },
    { label:"Vía periférica ok",      target:"plan",      text:"Vía periférica permeable, fijación íntegra." },
    { label:"Herida limpia/seca",     target:"plan",      text:"Herida quirúrgica limpia y seca, sin signos de infección." },
    { label:"Tareas pendientes",      target:"pendientes",text:"Revisar herida a las 20:00; controlar balance hídrico cada 4 h." },
  ];

  function appendTo(target:Target, text:string){
    if (!text?.trim()) return;
    if (target === "evolucion") setEvolucion(v => (v ? v+"\n" : "") + text);
    if (target === "meds")      setMeds(v => (v ? v+"\n" : "") + text);
    if (target === "plan")      setPlan(v => (v ? v+"\n" : "") + text);
    if (target === "pendientes")setPendientes(v => (v ? v+"\n" : "") + text);
  }

  async function onSave() {
    if (!patientId) { alert("Selecciona paciente"); return; }
    const p = selected!;
    const texto =
`ENTREGA DE TURNO (${turno === "dia" ? "DÍA" : "NOCHE"}) 12h
Paciente: ${fullName(p)}  |  Sexo: ${p.gender || ""}  |  Nac.: ${p.birthDate || ""}
ID: ${p.id || p.identifier?.[0]?.value || ""}

Dispositivos activos: ${devices.length ? devices.join(", ") : "ninguno"}

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

    const title = `Entrega de turno ${turno} (${new Date().toLocaleString()})`;
    await savePatientDocument(patientId, "handover", title, texto);
    alert("Entrega registrada en historial del paciente.");
    setEvolucion(""); setMeds(""); setPlan(""); setPendientes("");
  }

  return (
    <div style={{ display:"grid", gap:16 }}>
      <h1>Entrega de Turno (12 h)</h1>

      <div className="card" style={{ display:"grid", gap:8 }}>
        <div style={{ display:"grid", gridTemplateColumns:"minmax(240px,1fr) minmax(240px,1fr)", gap:8 }}>
          <div>
            <div className="muted">Paciente</div>
            <select value={patientId} onChange={(e)=>setPatientId(e.target.value)} style={{ width:"100%", padding:8 }}>
              <option value="">— Selecciona —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{fullName(p)} ({p.id})</option>)}
            </select>
          </div>
          <div>
            <div className="muted">Turno</div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="button" onClick={()=>setTurno("dia")} disabled={turno==="dia"}>Día (07–19)</button>
              <button className="button" onClick={()=>setTurno("noche")} disabled={turno==="noche"}>Noche (19–07)</button>
            </div>
          </div>
        </div>

        {patientId && (
          <div className="card">
            <div style={{ fontWeight:700, marginBottom:6 }}>Datos del paciente</div>
            <div className="muted">{fullName(selected)} — {selected.gender || "?"} — {selected.birthDate || "s/f"}</div>
            <div>Dispositivos: {devices.length ? devices.join(", ") : "ninguno"}</div>
            <div className="muted">Ventana {start} → {end}</div>
          </div>
        )}

        {/* === Evolución === */}
        <label className="card" style={{ display:"grid", gap:6 }}>
          <span className="muted">Evolución / hechos relevantes</span>
          <textarea rows={4} value={evolucion} onChange={(e)=>setEvolucion(e.target.value)} />
          <FeatureGate when={flags.VOICE_NOTES}>
            <div style={{ marginTop:6 }}>
              <MicButton onDone={(t)=>appendTo("evolucion", t)} />
            </div>
          </FeatureGate>
        </label>

        {/* === Medicación === */}
        <label className="card" style={{ display:"grid", gap:6 }}>
          <span className="muted">Cambios de medicación</span>
          <textarea rows={3} value={meds} onChange={(e)=>setMeds(e.target.value)} />
          <FeatureGate when={flags.VOICE_NOTES}>
            <div style={{ marginTop:6 }}>
              <MicButton onDone={(t)=>appendTo("meds", t)} />
            </div>
          </FeatureGate>
        </label>

        {/* === Plan === */}
        <label className="card" style={{ display:"grid", gap:6 }}>
          <span className="muted">Plan / objetivos</span>
          <textarea rows={3} value={plan} onChange={(e)=>setPlan(e.target.value)} />
          <FeatureGate when={flags.VOICE_NOTES}>
            <div style={{ marginTop:6 }}>
              <MicButton onDone={(t)=>appendTo("plan", t)} />
            </div>
          </FeatureGate>
        </label>

        {/* === Pendientes === */}
        <label className="card" style={{ display:"grid", gap:6 }}>
          <span className="muted">Pendientes para el siguiente turno</span>
          <textarea rows={3} value={pendientes} onChange={(e)=>setPendientes(e.target.value)} />
          <FeatureGate when={flags.VOICE_NOTES}>
            <div style={{ marginTop:6 }}>
              <MicButton onDone={(t)=>appendTo("pendientes", t)} />
            </div>
          </FeatureGate>
        </label>

        {/* Macros 1-click (no invasivas) */}
        <div className="card" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {macros.map((m, i) => (
            <button key={i} type="button" className="button" onClick={()=>appendTo(m.target, m.text)}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button className="button" onClick={onSave}>Guardar entrega en historial</button>
          <a className="button" href="/ai">Usar IA avanzada</a>
        </div>
      </div>

      {patientId && (
        <MultiAgentAssist
          title="IA (resumen/nota FHIR sobre esta entrega)"
          placeholder="Escribe cualquier matiz o deja que IA estructure la entrega…"
          defaultNote={`Paciente ${fullName(selected)}. Entrega de turno ${turno}. Dispositivos: ${devices.join(", ")}.`}
          context={{ role:"nurse", handover:true }}
        />
      )}
    </div>
  );
}

