import React, { useState } from "react";
import { STORE_KEYS } from "@/lib/store";

type CodeBlueEvent = {
  patientId: string;
  note: string;
  timestamp: string;
};

const STORAGE_PREFIX = "nurseos:";

export default function CodeBlue() {
  const [patientId, setPatientId] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string>("");

  function persist(e: CodeBlueEvent) {
    const key = STORAGE_PREFIX + STORE_KEYS.CODE_BLUE;
    const prev = JSON.parse(localStorage.getItem(key) || "[]") as CodeBlueEvent[];
    localStorage.setItem(key, JSON.stringify([...prev, e]));
  }

  function handleSubmit() {
    if (!patientId) return;
    const payload: CodeBlueEvent = {
      patientId,
      note,
      timestamp: new Date().toISOString(),
    };
    persist(payload);
    setStatus("Código Azul registrado"); // <- texto esperado por el test
    setPatientId("");
    setNote("");
  }

  return (
    <section style={{ display: "grid", gap: 12, maxWidth: 640 }}>
      <h1 style={{ color: "rgb(138, 0, 16)" }}>CÓDIGO AZUL</h1>

      <div>
        <label htmlFor="cb-pid">Patient ID</label>
        <input
          id="cb-pid"
          style={{ marginLeft: 8 }}
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="cb-note">Nota</label>
        <input
          id="cb-note"
          placeholder="p.ej., PCR presenciada"
          style={{ marginLeft: 8, width: "100%" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        onClick={handleSubmit}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          background: "rgb(185, 28, 28)",
          color: "#fff",
          border: "none",
        }}
      >
        Registrar Código Azul
      </button>

      {status && (
        <p role="status" aria-live="polite">
          {status}
        </p>
      )}

      <p style={{ fontSize: 12, color: "rgb(107,114,128)" }}>
        No sustituye a los protocolos institucionales. Revisión humana obligatoria.
      </p>
    </section>
  );
}


