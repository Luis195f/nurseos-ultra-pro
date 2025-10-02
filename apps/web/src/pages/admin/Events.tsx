import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

async function fetchEvents(p: {status?:string; category?:string; resource_type?:string}) {
  const params = new URLSearchParams();
  if (p.status) params.set("status", p.status);
  if (p.category) params.set("category", p.category);
  if (p.resource_type) params.set("resource_type", p.resource_type);
  const r = await fetch(`/api/events?${params.toString()}`);
  return r.json();
}

export default function Events() {
  const [status,setStatus] = useState<string>();
  const [category,setCategory] = useState<string>();
  const [rtype,setRtype] = useState<string>();
  const { data, isLoading } = useQuery({
    queryKey: ["events", status, category, rtype],
    queryFn: () => fetchEvents({status, category, resource_type: rtype})
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Event Log</h1>
      <div className="flex gap-2 mb-4">
        <select className="border rounded px-2 py-1" value={status||""} onChange={e=>setStatus(e.target.value||undefined)}>
          <option value="">Status (all)</option>
          {["OK","ERROR"].map(s=><option key={s}>{s}</option>)}
        </select>
        <select className="border rounded px-2 py-1" value={category||""} onChange={e=>setCategory(e.target.value||undefined)}>
          <option value="">Category (all)</option>
          {["FHIR","AUTH","UI","ABAC","JOB"].map(s=><option key={s}>{s}</option>)}
        </select>
        <select className="border rounded px-2 py-1" value={rtype||""} onChange={e=>setRtype(e.target.value||undefined)}>
          <option value="">Resource (all)</option>
          {["Patient","Observation","Encounter","Consent"].map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <div>Cargando…</div> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">TS</th><th>Cat</th><th>Action</th><th>Status</th>
            <th>Resource</th><th>HTTP</th>
          </tr></thead>
          <tbody>
            {data?.map((e:any)=>(
              <tr key={e.id} className="border-b">
                <td className="py-2">{new Date(e.ts).toLocaleString()}</td>
                <td>{e.category}</td><td>{e.action}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs ${e.status==='OK'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{e.status}</span></td>
                <td>{e.resource_type}{e.resource_id?`/${e.resource_id}`:''}</td>
                <td>{e.http_status ?? '-'}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={6} className="py-6 text-center text-gray-500">Sin eventos</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
