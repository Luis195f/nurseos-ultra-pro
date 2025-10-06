import { FLAGS } from "../config/flags";
import { buildBCMABundle } from "../fhir/builders";
export default function BCMAPro(){
  if(!FLAGS.bcmaDemo) return null;
  let inputValue = "";
  async function onSubmit(ev:any){
    ev.preventDefault();
    const bundle = buildBCMABundle({ patientRef:"Patient/1", medCode: inputValue, performerRef:"Practitioner/1" });
    console.log("BCMA Bundle", bundle);
    alert("BCMA draft creado (consola).");
  }
  return (<form onSubmit={onSubmit}>
    <input placeholder="Escanea o escribe código" onChange={(e:any)=>inputValue=e.target.value}/>
    <button type="submit">Registrar draft</button>
  </form>);
}
