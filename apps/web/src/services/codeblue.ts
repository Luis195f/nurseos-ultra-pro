// Servicios comunes para Código Azul: tipos + PDF + Bundle (FHIR R4)
export type CodeBlueRole = "leader"|"compressions"|"airway"|"meds"|"recorder";
export type CodeBlueEventType = "CPR_START"|"CPR_STOP"|"DEFIB"|"MED"|"ROSC"|"NOTE";

export type CodeBlueEvent = {
  id: string;
  at: string;  // ISO
  type: CodeBlueEventType;
  data?: any;
};

export type CodeBlueSession = {
  sessionId: string;
  startedAt: string;
  stoppedAt?: string;
  patientId?: string;
  roles: Partial<Record<CodeBlueRole,string>>;
  events: CodeBlueEvent[];
  authorUserId: string;
};

function uuid(){
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const toSec = (s: string) => s.replace("Z","").replace("T"," ").slice(0,19)+"Z";

// Genera PDF (base64) — usa import dinámico de pdf-lib (evita romper build si no está aún instalado)
export async function buildPdf(session: CodeBlueSession): Promise<string> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawText("Código Azul — Registro", { x: 40, y: 800, size: 18, font, color: rgb(0,0,0) });
  const meta = [
    `Sesión: ${session.sessionId}`,
    `Paciente: ${session.patientId || "-"}`,
    `Inicio: ${session.startedAt}`,
    `Fin: ${session.stoppedAt || "-"}`,
    `Roles: ${Object.entries(session.roles).map(([k,v])=>`${k}:${v||"-"}`).join(" | ")}`,
  ].join("\n");
  page.drawText(meta, { x: 40, y: 770, size: 11, font });

  let y = 740;
  page.drawText("Línea de tiempo:", { x: 40, y, size: 12, font }); y -= 16;
  for (const ev of session.events) {
    const line = `${toSec(ev.at)}  • ${ev.type}` + (ev.data ? `  ${JSON.stringify(ev.data)}` : "");
    page.drawText(line, { x: 50, y, size: 10, font });
    y -= 14; if (y < 60) { y = 780; pdf.addPage([595,842]); }
  }

  const bytes = await pdf.save();
  return btoa(String.fromCharCode(...bytes)); // base64
}

// Crea Bundle transaction con Composition + eventos + DocumentReference (PDF)
export function buildBundle(session: CodeBlueSession, pdfB64?: string){
  const entries: any[] = [];
  const refs: string[] = [];

  // Composition raíz
  const compFullUrl = `urn:uuid:${uuid()}`;
  const comp = {
    resourceType: "Composition",
    status: "final",
    type: { text: "Código Azul" },
    title: "Registro de Código Azul",
    date: new Date().toISOString(),
    subject: session.patientId ? { reference: `Patient/${session.patientId}` } : undefined,
    author: session.authorUserId ? [{ reference: `Practitioner/${session.authorUserId}`, display: session.authorUserId }] : [],
    section: [] as any[],
  };
  entries.push({ fullUrl: compFullUrl, resource: comp, request: { method: "POST", url: "Composition" } });

  // Mapear eventos
  for (const ev of session.events) {
    if (ev.type === "MED") {
      const fu = `urn:uuid:${uuid()}`;
      const r = {
        resourceType: "MedicationAdministration",
        status: "completed",
        effectiveDateTime: ev.at,
        subject: session.patientId ? { reference:`Patient/${session.patientId}` } : undefined,
        medicationCodeableConcept: { text: ev.data?.medName || "Medicamento" },
        dosage: { text: `${ev.data?.dose || ""} ${ev.data?.route || ""}`.trim() },
      };
      entries.push({ fullUrl: fu, resource: r, request: { method: "POST", url: "MedicationAdministration" } });
      refs.push(fu);
    } else if (ev.type === "DEFIB") {
      const fu = `urn:uuid:${uuid()}`;
      const r = {
        resourceType: "Procedure",
        status: "completed",
        code: { text: "Desfibrilación" },
        performedDateTime: ev.at,
        subject: session.patientId ? { reference:`Patient/${session.patientId}` } : undefined,
        note: [{ text: `Joules: ${ev.data?.joules ?? "?"}` }],
      };
      entries.push({ fullUrl: fu, resource: r, request: { method: "POST", url: "Procedure" } });
      refs.push(fu);
    } else {
      const fu = `urn:uuid:${uuid()}`;
      const r = {
        resourceType: "Observation",
        status: "final",
        code: { text: ev.type },
        effectiveDateTime: ev.at,
        subject: session.patientId ? { reference:`Patient/${session.patientId}` } : undefined,
        valueString: ev.data ? JSON.stringify(ev.data) : undefined,
      };
      entries.push({ fullUrl: fu, resource: r, request: { method: "POST", url: "Observation" } });
      refs.push(fu);
    }
  }

  // PDF → DocumentReference
  if (pdfB64) {
    const drFullUrl = `urn:uuid:${uuid()}`;
    const dr = {
      resourceType: "DocumentReference",
      status: "current",
      type: { text: "Código Azul — PDF" },
      subject: session.patientId ? { reference:`Patient/${session.patientId}` } : undefined,
      date: new Date().toISOString(),
      content: [{ attachment: { contentType: "application/pdf", data: pdfB64, title: "code-blue.pdf" } }],
    };
    entries.push({ fullUrl: drFullUrl, resource: dr, request: { method: "POST", url: "DocumentReference" } });
    (comp.section as any[]).push({ title: "Documento", entry: [{ reference: drFullUrl }] });
  }

  // Sección con referencias a todos los eventos
  if (refs.length) (comp.section as any[]).push({ title: "Eventos", entry: refs.map((r) => ({ reference: r })) });

  return { resourceType: "Bundle", type: "transaction", entry: entries };
}
