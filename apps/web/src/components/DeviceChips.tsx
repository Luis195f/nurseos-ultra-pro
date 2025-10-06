import { useEffect, useState } from "react";
import { key, load, save } from "../lib/store";
import { ensurePatient, hasFHIR, registerDeviceUse } from "../lib/fhir";

type Props = {
  selected: string[];
  onToggle: (code: string) => void;
};

const OPTIONS = [
  "Oxígeno",
  "Monitor",
  "Bomba infusión",
  "SNG",
  "Sonda vesical",
  "Catéter central",
  "CPAP/BiPAP",
  "Marcapasos transitorio",
];

export default function DeviceChips({ selected, onToggle }: Props) {
  const [items, setItems] = useState<string[]>(selected ?? []);
  const [pid, setPid] = useState<string>("");

  // carga/guarda selección simple en localStorage y asegura paciente (stub)
  useEffect(() => {
    const s = load<string[]>("device_chips") ?? [];
    if (s.length) setItems(s);
  }, []);

  useEffect(() => {
    save("device_chips", items);
  }, [items]);

  async function toggle(code: string) {
    const next = items.includes(code)
      ? items.filter((c) => c !== code)
      : [...items, code];

    setItems(next);
    onToggle?.(code);

    // “Registro rápido” en FHIR si está configurado (no rompe si no hay FHIR)
    try {
      if (hasFHIR() && pid) {
        await ensurePatient(pid);
        await registerDeviceUse(pid, code);
      }
    } catch {
      // silencioso: no bloquea la UI
    }
  }

  return (
    <div className="flex items-start gap-2 flex-wrap">
      <input
        placeholder="Paciente ID"
        className="border rounded px-2 py-1"
        value={pid}
        onChange={(e) => setPid(e.target.value.trim())}
      />
      {OPTIONS.map((opt) => {
        const active = items.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(opt)}
            className={
              "px-3 py-1 rounded-full border text-sm " +
              (active
                ? "bg-red-700 text-white border-red-700"
                : "bg-white text-gray-800 border-gray-300 hover:border-gray-500")
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}


/** Compat export para Registry */
export { OPTIONS as DEVICE_CATALOG };
