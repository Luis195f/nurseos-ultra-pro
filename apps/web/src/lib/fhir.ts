// Cliente FHIR mínimo y helpers “seguros” (no fallan si no hay servidor)
const BASE = (import.meta as any).env?.VITE_FHIR_BASE_URL?.trim?.() || "";

export function hasFHIR(): boolean {
  return !!BASE;
}

// POST genérico
async function fhirPost(resourceType: string, body: any) {
  const res = await fetch(`${BASE}/${resourceType}`, {
    method: "POST",
    headers: { "Content-Type": "application/fhir+json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`FHIR ${resourceType} ${res.status}`);
  return res.json();
}

// Garantiza que el Patient exista (stub amable para demo)
export async function ensurePatient(patientId: string) {
  if (!patientId) return null;
  if (!hasFHIR()) return { id: patientId }; // sin red: no-op amable
  // Intento naive de read; si 404, crea
  const read = await fetch(`${BASE}/Patient/${encodeURIComponent(patientId)}`);
  if (read.ok) return read.json();
  if (read.status !== 404) throw new Error("FHIR Patient read error");
  return fhirPost("Patient", {
    resourceType: "Patient",
    id: patientId,
    identifier: [{ system: "urn:nurseos:id", value: patientId }],
  });
}

// Registra uso de dispositivo (DeviceUseStatement) súper simple
export async function registerDeviceUse(patientId: string, display: string) {
  if (!hasFHIR() || !patientId || !display) return null;
  const body = {
    resourceType: "DeviceUseStatement",
    status: "active",
    subject: { reference: `Patient/${patientId}` },
    device: { display },
    recordedOn: new Date().toISOString(),
  };
  return fhirPost("DeviceUseStatement", body);
}
// === Opcional FHIR para Código Azul y Fallecidos ===

// Observation simple para "Code Blue"
export async function registerCodeBlue(patientId: string, note?: string) {
  if (!hasFHIR() || !patientId) return null;
  await ensurePatient(patientId);
  return fhirPost("Observation", {
    resourceType: "Observation",
    status: "final",
    code: { text: "Code Blue" },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: new Date().toISOString(),
    note: note ? [{ text: note }] : undefined,
  });
}

// JSON Patch mínimo a Patient (no pisa otros campos)
async function patchPatient(patientId: string, ops: any[]) {
  const res = await fetch(`${BASE}/Patient/${encodeURIComponent(patientId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(ops),
  });
  if (!res.ok) throw new Error(`FHIR Patient PATCH ${res.status}`);
  return res.json();
}

// Marca paciente fallecido y registra observación opcional de causa
export async function markDeceased(
  patientId: string,
  dateTimeISO: string,
  cause?: string
) {
  if (!hasFHIR() || !patientId) return null;
  await ensurePatient(patientId);
  await patchPatient(patientId, [
    { op: "add", path: "/deceasedDateTime", value: dateTimeISO },
  ]);
  if (cause) {
    await fhirPost("Observation", {
      resourceType: "Observation",
      status: "final",
      code: { text: "Cause of death" },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: dateTimeISO,
      note: [{ text: cause }],
    });
  }
  return true;
}
