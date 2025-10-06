import { useState } from "react";
import DeviceChips from "../components/DeviceChips";

export default function PatientRecord() {
  const [devices, setDevices] = useState<string[]>([]);
  const onToggle = (code: string) => {
    setDevices((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Registro completo de paciente</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">Comorbilidades (un click)</h2>
        <DeviceChips selected={devices} onToggle={onToggle} />
      </section>

      <pre className="text-xs bg-gray-50 border rounded p-3">
        {JSON.stringify({ devices }, null, 2)}
      </pre>
    </div>
  );
}

