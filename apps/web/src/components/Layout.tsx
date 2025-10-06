export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 bg-white border-b">
        <nav className="mx-auto max-w-6xl px-4 py-3 flex gap-4 text-sm">
          <a href="/" className="font-bold">NurseOS Ultra Pro</a>
          <a href="/ai">IA</a>
          <a href="/patients/P001">Paciente</a>
          <a href="/scales">Escalas</a>
          <a href="/code-blue">Código Azul</a>
          <a href="/deceased">Fallecidos</a>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
