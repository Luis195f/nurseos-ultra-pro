// apps/web/src/lib/fhir.ts
export const FHIR_BASE =
  (import.meta as any).env?.VITE_FHIR_BASE_URL?.trim?.() || "";
export const hasFHIR = !!FHIR_BASE;

type FhirResource<T extends string> = {
  resourceType: T;
  id?: string;
  [k: string]: any;
};

async function fhirFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  if (!hasFHIR) throw new Error("FHIR no está configurado");
  const base = FHIR_BASE.replace(/\/$/, "");
  const url = `${base}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/fhir+json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FHIR ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Crea/actualiza un Patient con PUT Patient/{id} */
export async function ensurePatient(
  id: string,
  partial?: Partial<FhirResource<"Patient">>
) {
  const p: FhirResource<"Patient"> = {
    resourceType: "Patient",
    id,
    ...(partial ?? {}),
  };
  await fhirFetch(`Patient/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(p),
  });
}

/** Registra un Device y un DeviceUseStatement asociado al paciente */
export async function registerDeviceUse(
  patientId: string,
  device: { code: string; text?: string }
) {
  const dev: FhirResource<"Device"> = {
    resourceType: "Device",
    type: device.text
      ? {
          text: device.text,
          coding: [
            {
              system: "urn:nurseos:device",
              code: device.code,
              display: device.text,
            },
          ],
        }
      : { coding: [{ system: "urn:nurseos:device", code: device.code }] },
    status: "active",
  };

  const created = await fhirFetch<FhirResource<"Device">>("Device", {
    method: "POST",
    body: JSON.stringify(dev),
  });

  const dus: FhirResource<"DeviceUseStatement"> = {
    resourceType: "DeviceUseStatement",
    status: "active",
    subject: { reference: `Patient/${patientId}` },
    device: { reference: `Device/${created.id}` },
  };
  await fhirFetch("DeviceUseStatement", {
    method: "POST",
    body: JSON.stringify(dus),
  });
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
