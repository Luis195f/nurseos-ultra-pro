/* apps/web/src/lib/fhir.ts
   -------------------------------------------------------------------
   Fachada FHIR “superset” sin romper lo existente.
   - No depende de services/fhirClient.ts (evita incompatibilidades).
   - Exporta helpers usados por pantallas: ensurePatient, ensureEncounter,
     ensureDevice, setDeceased, savePatientDocument, makeBundle, hasFHIR.
   - Dual-mode: si no hay BASE, lanza error claro (lo capturas donde llames).
   ------------------------------------------------------------------- */

export const FHIR_BASE: string = (import.meta as any).env?.VITE_FHIR_BASE_URL?.trim?.() || "";
export const hasFHIR: boolean = !!FHIR_BASE;

type Any = any;

// -------- fetch seguro (application/fhir+json) ----------
async function http<T = Any>(path: string, init?: RequestInit): Promise<T> {
  if (!FHIR_BASE) throw new Error("VITE_FHIR_BASE_URL no configurado");
  const res = await fetch(`${FHIR_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/fhir+json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// -------- Cliente FHIR pequeño y autosuficiente ----------
export const Fhir = {
  create: <T = Any>(type: string, body: Any) =>
    http<T>(`/${type}`, { method: "POST", body: JSON.stringify(body) }),
  update: <T = Any>(type: string, id: string, body: Any) =>
    http<T>(`/${type}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  read: <T = Any>(type: string, id: string) => http<T>(`/${type}/${id}`),
  search: <T = Any>(type: string, qs: string) => http<T>(`/${type}?${qs}`),
  patch: <T = Any>(type: string, id: string, ops: Any[]) =>
    http<T>(`/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json-patch+json" },
      body: JSON.stringify(ops),
    }),
  bundle: <T = Any>(bundle: Any) =>
    http<T>("", { method: "POST", body: JSON.stringify(bundle) }),
};

// -------- Utils ----------
export function makeBundle(resources: Any[]) {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: resources.map((r) => ({
      fullUrl: r.id ? `${r.resourceType}/${r.id}` : undefined,
      resource: r,
      request: {
        method: r.id ? "PUT" : "POST",
        url: r.id ? `${r.resourceType}/${r.id}` : r.resourceType,
      },
    })),
  };
}

// -------- Helpers de alto nivel (compatibles con tu app) ----------
export async function ensurePatient(id: string, patch?: Any) {
  try {
    const p = await Fhir.read<Any>("Patient", id);
    if (patch) {
      if (Array.isArray(patch)) return Fhir.patch("Patient", id, patch);
      return Fhir.update("Patient", id, { ...p, ...patch });
    }
    return p;
  } catch {
    // Si no existe, créalo por PUT con id asignado por cliente
    const body = {
      resourceType: "Patient",
      id,
      active: true,
      ...(patch || {}),
      name: (patch?.name || [{ text: id }]),
      meta: { tag: [{ system: "https://nurseos.dev/demo", code: "seed" }] },
    };
    return Fhir.update("Patient", id, body);
  }
}

export async function ensureEncounter(patientId: string) {
  const bundle = await Fhir.search<Any>(
    "Encounter",
    `subject=Patient/${patientId}&status=arrived,in-progress,triaged&_sort=-date&_count=1`
  );
  const found = bundle?.entry?.[0]?.resource;
  if (found) return found;

  const id = `enc-${Date.now()}`;
  const enc = {
    resourceType: "Encounter",
    id,
    status: "in-progress",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "IMP",
      display: "inpatient encounter",
    },
    subject: { reference: `Patient/${patientId}` },
    period: { start: new Date().toISOString() },
  };
  return Fhir.update("Encounter", id, enc);
}

export async function ensureDevice(
  patientId: string,
  code = "dev-unknown",
  display = "Dispositivo"
) {
  const did = `dev-${code}`;
  let device: Any;
  try {
    device = await Fhir.read<Any>("Device", did);
  } catch {
    device = await Fhir.update<Any>("Device", did, {
      resourceType: "Device",
      id: did,
      status: "active",
      type: { coding: [{ system: "http://snomed.info/sct", code, display }] },
    });
  }
  const dusId = `dus-${patientId}-${did}`;
  const dus = await Fhir.update<Any>("DeviceUseStatement", dusId, {
    resourceType: "DeviceUseStatement",
    id: dusId,
    status: "active",
    subject: { reference: `Patient/${patientId}` },
    device: { reference: `Device/${did}` },
    recordedOn: new Date().toISOString(),
  });
  return { device, use: dus };

}

export async function setDeceased(patientId: string, deceasedDateTime: string) {
  return Fhir.patch<Any>("Patient", patientId, [
    { op: "add", path: "/deceasedDateTime", value: deceasedDateTime },
  ]);
}

export async function postObservation(obs: Any) {
  return Fhir.create<Any>("Observation", obs);
}

export async function savePatientDocument(
  patientId: string,
  kind: "evolution" | "handover" | "note" | string,
  title: string,
  text: string
) {
  const compId = `comp-${patientId}-${Date.now()}`;
  const comp = {
    resourceType: "Composition",
    id: compId,
    status: "final",
    type: {
      coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }],
    },
    subject: { reference: `Patient/${patientId}` },
    date: new Date().toISOString(),
    title,
    section: [{ title: kind, text: { status: "generated", div: `<div>${text}</div>` } }],
  };

  const doc = {
    resourceType: "DocumentReference",
    status: "current",
    type: { coding: [{ system: "http://loinc.org", code: "11506-3" }] },
    subject: { reference: `Patient/${patientId}` },
    date: new Date().toISOString(),
    content: [{ attachment: { contentType: "text/markdown", data: btoa(text) } }],
  };

  const bundle = makeBundle([comp, doc]);
  return Fhir.bundle<Any>(bundle);
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
