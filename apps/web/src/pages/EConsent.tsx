import { FLAGS } from "../config/flags";
import { buildEConsentBundle } from "../fhir/builders";
export default function EConsent(){
  if(!FLAGS.eConsent) return null;
  let txt = "";
  async function save(ev:any){
    ev.preventDefault();
    const b = buildEConsentBundle({ patientRef:"Patient/1", consentText: txt, byUser:"Practitioner/1" });
    console.log("Consent Bundle", b);
    alert("E-Consent draft creado (consola).");
  }
  return (<form onSubmit={save}>
    <textarea onChange={(e:any)=>txt=e.target.value} placeholder="Texto de consentimiento..." />
    <button>Guardar borrador</button>
  </form>);
}
