import type { Bundle, Resource } from "./types"; // asume tienes types, si no, crea dummies
const now = () => new Date().toISOString();

function txBundle(entries: Resource[]): Bundle {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries.map(r => ({ resource: r, request: { method: "POST", url: r.resourceType } }))
  } as any;
}

export function buildHandoverBundle({patientRef, note, byUser}: {patientRef:string; note:string; byUser:string;}): Bundle {
  const obs: any = {
    resourceType: "Observation",
    status: "final",
    code: { coding: [{ system:"http://loinc.org", code:"11506-3", display:"Report of clinical notes" }]},
    subject: { reference: patientRef },
    effectiveDateTime: now(),
    performer: [{ reference: byUser }],
    valueString: note
  };
  return txBundle([obs]);
}

export function buildScaleBundle({patientRef, code, value, byUser}:{patientRef:string; code:string; value:number; byUser:string;}): Bundle {
  const obs: any = {
    resourceType: "Observation",
    status: "final",
    code: { coding: [{ system:"http://loinc.org", code, display:"Scale score" }]},
    subject: { reference: patientRef },
    effectiveDateTime: now(),
    performer: [{ reference: byUser }],
    valueQuantity: { value }
  };
  return txBundle([obs]);
}

export function buildEConsentBundle({patientRef, consentText, byUser}:{patientRef:string; consentText:string; byUser:string;}): Bundle {
  const consent: any = {
    resourceType: "Consent",
    status: "active",
    scope: { coding:[{ system:"http://terminology.hl7.org/CodeSystem/consentscope", code:"patient-privacy" }]},
    patient: { reference: patientRef },
    dateTime: now(),
    sourceAttachment: { contentType:"text/plain", data: Buffer.from(consentText).toString("base64") }
  };
  return txBundle([consent]);
}

export function buildBCMABundle({patientRef, medCode, performerRef}:{patientRef:string; medCode:string; performerRef:string;}): Bundle {
  const ma: any = {
    resourceType: "MedicationAdministration",
    status: "in-progress",
    subject: { reference: patientRef },
    effectiveDateTime: now(),
    medicationCodeableConcept: { coding:[{ system:"http://www.whocc.no/atc", code: medCode }]},
    performer: [{ actor: { reference: performerRef }}]
  };
  return txBundle([ma]);
}
