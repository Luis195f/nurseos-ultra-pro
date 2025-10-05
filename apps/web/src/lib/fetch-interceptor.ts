// Interceptor simple de fetch (no modifica nada por ahora; solo mantiene gancho centralizado)
const origFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    // Puedes añadir aquí headers, auth, logging, auditoría, etc.
    return await origFetch(input, init);
  } catch (e) {
    // Manejo centralizado de errores de red
    throw e;
  }
};

export {};
