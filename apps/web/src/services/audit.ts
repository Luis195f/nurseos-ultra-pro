// apps/web/src/services/audit.ts
export async function logAudit(evt: {
  userId: string;
  patientId?: string;
  action: string;
  data?: any;
}) {
  try {
    const base = (import.meta as any).env.VITE_AGENTS_API_URL || 'http://localhost:8070';
    const res = await fetch(`${base}/audit/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: evt.userId,
        patientId: evt.patientId,
        action: evt.action,
        hash: crypto.randomUUID(),
        data: evt.data,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
  } catch (e) {
    // No rompas UX si no hay API: log local
    console.debug('[audit]', evt);
  }
}
