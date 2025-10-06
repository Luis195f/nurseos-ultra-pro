export function registerSW(){
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  }
}
