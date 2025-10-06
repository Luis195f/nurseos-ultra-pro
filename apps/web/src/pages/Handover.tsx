import React, { useState } from "react";
import { FLAGS } from "../config/flags";
import MicButton from "../components/voice/MicButton";

type Form = {
  paciente?: string;
  evolucion?: string;
  cambios?: string;
  plan?: string;
  turno?: "day" | "night";
};

export default function Handover(){
  const [form, setForm] = useState<Form>({ turno: "day" });

  const append = (k: keyof Form) => (txt: string) =>
    setForm(f => ({ ...f, [k]: ((f[k] as string) || "") + (txt ? ( (f[k] ? " " : "") + txt ) : "") }));

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Entrega de Turno (12 h)</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Paciente</label>
          <select className="w-full border rounded p-2"
            value={form.paciente || ""}
            onChange={(e)=>setForm(f=>({...f, paciente:e.target.value}))}>
            <option value="">— Selecciona —</option>
            <option value="Patient/1">Paciente Demo 1</option>
            <option value="Patient/2">Paciente Demo 2</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Turno</label>
          <div className="flex gap-2">
            <button type="button" onClick={()=>setForm(f=>({...f, turno:"day"}))}
              className={`px-3 py-1 rounded ${form.turno==="day"?"bg-cyan-300":"bg-neutral-200"}`}>Día (07–19)</button>
            <button type="button" onClick={()=>setForm(f=>({...f, turno:"night"}))}
              className={`px-3 py-1 rounded ${form.turno==="night"?"bg-cyan-300":"bg-neutral-200"}`}>Noche (19–07)</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <section>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-1">Evolución / hechos relevantes</label>
            {FLAGS.voiceNotes && <MicButton lang="es-ES" onText={append("evolucion")} />}
          </div>
          <textarea className="w-full border rounded p-2 h-28"
            value={form.evolucion || ""} onChange={(e)=>setForm(f=>({...f, evolucion:e.target.value}))}/>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-1">Cambios de medicación</label>
            {FLAGS.voiceNotes && <MicButton lang="es-ES" onText={append("cambios")} />}
          </div>
          <textarea className="w-full border rounded p-2 h-24"
            value={form.cambios || ""} onChange={(e)=>setForm(f=>({...f, cambios:e.target.value}))}/>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-1">Plan / objetivos</label>
            {FLAGS.voiceNotes && <MicButton lang="es-ES" onText={append("plan")} />}
          </div>
          <textarea className="w-full border rounded p-2 h-24"
            value={form.plan || ""} onChange={(e)=>setForm(f=>({...f, plan:e.target.value}))}/>
        </section>
      </div>
    </div>
  );
}
