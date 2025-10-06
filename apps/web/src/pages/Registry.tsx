import React, { useMemo, useState } from "react";
import DeviceChips from "../components/DeviceChips";

const AGENTS = (import.meta as any).env.VITE_AGENTS_API_BASE || "";
const FHIR   = (import.meta as any).env.VITE_FHIR_BASE_URL   || "";

type Treat = { med: string; dose: string; route: "VO"|"IV"|"IM"|"SC"|"NG"|""; freq: string };

const PRESETS_COMORB = ["HTA","DM2","EPOC","ERC","Fibrilación auricular","Insuficiencia cardiaca","Obesidad","Hiperlipidemia"];
const PRESETS_TREAT: Treat[] = [
  { med:"Paracetamol",  dose:"1 g",    route:"IV", freq:"c/8h" },
  { med:"Amoxicilina",  dose:"500 mg", route:"VO", freq:"c/8h" },
  { med:"Enoxaparina",  dose:"40 mg",  route:"SC", freq:"cada 24 h" },
];
const PRESETS_VITALS = [
  { k:"fc",  label:"Frecuencia cardiaca (lpm)",  v:"82" },
  { k:"fr",  label:"Frecuencia respiratoria (rpm)", v:"18" },
  { k:"tas", label:"Tensión sistólica (mmHg)", v:"128" },
  { k:"tad", label:"Tensión diastólica (mmHg)", v:"78" },
  { k:"temp",label:"Temperatura (°C)", v:"36.8" },
  { k:"spo2",label:"SpO₂ (%)", v:"97" },
  { k:"glu", label:"Glucemia (mg/dL)", v:"108" },
];

export default function Registry(){
  const newId = useMemo(()=> "P" + Date.now().toString().slice(-6), []);
  const [patientId, setPatientId] = useState<string>(newId);
  const [name, setName] = useState<string>("");
  const [age,  setAge]  = useState<string>("");
  const [sex,  setSex]  = useState<"female"|"male"|"other"|"unknown">("female");

  const [comorb, setComorb] = useState<string[]>([]);
  const toggleComorb = (c: string)=> setComorb(s => s.includes(c) ? s.filter(x=>x!==c) : [...s,c]);

  const [dx, setDx] = useState<string>("");

  const [treats, setTreats] = useState<Treat[]>([]);
  const addTreat = (t: Treat)=> setTreats(ts => [...ts, t]);
  const removeTreat = (i: number)=> setTreats(ts => ts.filter((_,k)=>k!==i));

  const [vitals, setVitals] = useState<Record<string,string>>(()=>Object.fromEntries(PRESETS_VITALS.map(x=>[x.k,""])));
  const fillVitals = ()=> setVitals(Object.fromEntries(PRESETS_VITALS.map(x=>[x.k,x.v])));

  const [devices, setDevices] = useState<string[]>([]);
  const toggleDevice = (code: string)=> setDevices(s => s.includes(code) ? s.filter(x=>x!==code) : [...s, code]);

  async function saveAudit(action: string, details:any){
    try{
      if(!AGENTS) return;
      await fetch(`${AGENTS}/audit/log`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          ts: new Date().toISOString(),
          user: "nurse-demo",
          action,
          resourceType: "Bundle",
          patientId,
          allow: true,
          reason: "registry",
          details
        })
      });
    }catch(e){ /* no bloquear flujo clínico */ }
  }

  function buildBundle(){
    const resources:any[] = [];
    const patient = {
      resourceType:"Patient", id: patientId,
      name:[{ text:name }], gender: sex, extension:[{ url:"age", valueString:age }]
    };
    resources.push({ resource:patient, request:{ method:"PUT", url:`Patient/${patientId}` }});

    // Comorbilidades + Dx
    for(const c of comorb){
      resources.push({
        resource:{ resourceType:"Condition", subject:{ reference:`Patient/${patientId}` }, code:{ text:c }, clinicalStatus:{ text:"active" } },
        request:{ method:"POST", url:"Condition" }
      });
    }
    if(dx.trim()){
      resources.push({
        resource:{ resourceType:"Condition", subject:{ reference:`Patient/${patientId}` }, code:{ text:dx }, clinicalStatus:{ text:"active" } },
        request:{ method:"POST", url:"Condition" }
      });
    }

    // Tratamientos
    for(const t of treats){
      resources.push({
        resource:{
          resourceType:"MedicationStatement",
          subject:{reference:`Patient/${patientId}`},
          status:"active",
          medicationCodeableConcept:{ text:t.med },
          dosage:[{ text:`${t.dose} ${t.route} ${t.freq}` }]
        },
        request:{ method:"POST", url:"MedicationStatement" }
      });
    }

    // Signos + Glucemia
    const vit = vitals;
    const now = new Date().toISOString();
    const mkObs = (code:string, value:any, unit?:string)=> ({
      resourceType:"Observation",
      status:"final",
      subject:{ reference:`Patient/${patientId}` },
      effectiveDateTime: now,
      code:{ text: code },
      valueQuantity: (value!=="" && !isNaN(Number(value))) ? { value:Number(value), unit } : undefined,
      valueString: (value!=="" && isNaN(Number(value))) ? String(value) : undefined
    });
    const obs = [
      mkObs("FC", vit.fc, "lpm"),
      mkObs("FR", vit.fr, "rpm"),
      mkObs("TAS", vit.tas, "mmHg"),
      mkObs("TAD", vit.tad, "mmHg"),
      mkObs("Temp", vit.temp, "°C"),
      mkObs("SpO2", vit.spo2, "%"),
      mkObs("Glucemia", vit.glu, "mg/dL"),
    ].filter(Boolean);
    for(const o of obs){
      resources.push({ resource:o, request:{ method:"POST", url:"Observation" }});
    }

    // Dispositivos (Device + DeviceUseStatement)
    for(const code of devices){
      const meta = DEVICE_CATALOG.find(d=>d.code===code);
      const devId = `dev-${code}-${patientId}`;
      const dev = {
        resourceType:"Device",
        id: devId,
        type: { text: meta?.text || code },
        status: "active",
      };
      const use = {
        resourceType:"DeviceUseStatement",
        subject:{ reference:`Patient/${patientId}` },
        device: { reference:`Device/${devId}` },
        status: "active",
      };
      resources.push({ resource:dev, request:{ method:"PUT", url:`Device/${devId}` }});
      resources.push({ resource:use, request:{ method:"POST", url:"DeviceUseStatement" }});
    }

    return { resourceType:"Bundle", type:"transaction", entry:resources };
  }

  async function onSave(){
    const bundle = buildBundle();
    if(FHIR){
      const res = await fetch(FHIR, { method:"POST", headers:{ "Content-Type":"application/fhir+json" }, body: JSON.stringify(bundle) });
      if(!res.ok) throw new Error("FHIR error " + res.status);
    }else{
      localStorage.setItem(`nurseos/patients/${patientId}`, JSON.stringify(bundle));
    }
    await saveAudit("registry.save", { name, age, comorbCount: comorb.length, treats: treats.length, devices: devices });
    alert("✅ Registro guardado" + (FHIR ? " en FHIR" : " (local)"));
  }

  return (
    <section style={{display:"grid", gap:16, maxWidth:900}}>
      <h1>Registro completo de paciente</h1>

      <div style={{display:"grid", gridTemplateColumns:"1fr 120px 160px", gap:8}}>
        <div>
          <label>Paciente ID</label>
          <input value={patientId} onChange={e=>setPatientId(e.target.value)} style={{width:"100%"}} />
        </div>
        <div>
          <label>Edad</label>
          <input value={age} onChange={e=>setAge(e.target.value)} />
        </div>
        <div>
          <label>Sexo</label>
          <select value={sex} onChange={e=>setSex(e.target.value as any)} style={{width:"100%"}}>
            <option value="female">Femenino</option>
            <option value="male">Masculino</option>
            <option value="other">Otro</option>
            <option value="unknown">Desconocido</option>
          </select>
        </div>
        <div style={{gridColumn:"1 / span 3"}}>
          <label>Nombre</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={{width:"100%"}} />
        </div>
      </div>

      <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12}}>
        <h2>Comorbilidades (un click)</h2>
        <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
          {PRESETS_COMORB.map(c =>
            <button key={c} onClick={()=>toggleComorb(c)}
              style={{padding:"6px 10px", borderRadius:20, border:"1px solid #ddd", background: comorb.includes(c)?"#d9f99d":"#fff"}}>
              {c}
            </button>)}
        </div>
      </div>

      <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12}}>
        <h2>Diagnóstico médico</h2>
        <input value={dx} onChange={e=>setDx(e.target.value)} placeholder="p.ej., Neumonía adquirida en la comunidad"
               style={{width:"100%"}} />
      </div>

      <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12, display:"grid", gap:8}}>
        <h2>Tratamiento actual (un click)</h2>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          {PRESETS_TREAT.map((t,i)=>
            <button key={i} onClick={()=>addTreat(t)} style={{padding:"6px 10px", border:"1px solid #ddd", borderRadius:8}}>
              {t.med} {t.dose} {t.route} {t.freq}
            </button>
          )}
        </div>
        <div style={{display:"grid", gap:6}}>
          {treats.map((t,i)=>
            <div key={i} style={{display:"grid", gridTemplateColumns:"1fr 120px 90px 120px auto", gap:6}}>
              <input value={t.med} onChange={e=>setTreats(ts=>ts.map((x,k)=>k===i?{...x,med:e.target.value}:x))} placeholder="Medicamento"/>
              <input value={t.dose} onChange={e=>setTreats(ts=>ts.map((x,k)=>k===i?{...x,dose:e.target.value}:x))} placeholder="Dosis"/>
              <select value={t.route} onChange={e=>setTreats(ts=>ts.map((x,k)=>k===i?{...x,route:e.target.value as any}:x))}>
                <option value="">Vía</option><option>VO</option><option>IV</option><option>IM</option><option>SC</option><option>NG</option>
              </select>
              <input value={t.freq} onChange={e=>setTreats(ts=>ts.map((x,k)=>k===i?{...x,freq:e.target.value}:x))} placeholder="Frecuencia"/>
              <button onClick={()=>removeTreat(i)} style={{color:"#a00"}}>Quitar</button>
            </div>
          )}
        </div>
      </div>

      <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12}}>
        <h2>Dispositivos (un click)</h2>
        <DeviceChips selected={devices} onToggle={toggleDevice} />
      </div>

      <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <h2 style={{margin:0}}>Signos vitales + Glucemia</h2>
          <button onClick={fillVitals} style={{padding:"4px 10px", border:"1px solid #ddd", borderRadius:6}}>Autollenar (un click)</button>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginTop:8}}>
          {PRESETS_VITALS.map(v =>
            <div key={v.k}>
              <label>{v.label}</label>
              <input value={vitals[v.k]||""} onChange={e=>setVitals(s=>({...s,[v.k]:e.target.value}))} style={{width:"100%"}}/>
            </div>
          )}
        </div>
      </div>

      <div style={{display:"flex", gap:12}}>
        <button onClick={onSave} style={{padding:"10px 14px", borderRadius:8, background:"#06b6d4", color:"#fff", border:"none"}}>
          Guardar
        </button>
      </div>
    </section>
  );
}

