import React from "react";
import { RegistryPage as RegistryImpl } from "@nurseos/registry";
export default function RegistryPage(){ return <RegistryImpl/> }
import React, { Suspense } from "react";
import LocalRegistry from "./Registry";

// Intento “perezoso” de cargar paquete externo si está disponible.
// Si falla el import dinámico, caemos al LocalRegistry sin romper nada.
const External = React.lazy(async () => {
  try {
    const mod = await import("@nurseos/registry");
    const Comp = (mod as any).RegistryPage || (mod as any).default;
    if (Comp) return { default: Comp };
    return { default: LocalRegistry };
  } catch {
    return { default: LocalRegistry };
  }
});

export default function RegistryPage() {
  return (
    <Suspense fallback={<LocalRegistry />}>
      <External />
    </Suspense>
  );
}