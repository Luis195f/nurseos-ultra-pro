// apps/web/src/components/voice/MicButton.tsx
import { useState } from "react";
import { useSpeech } from "./useSpeech";

export default function MicButton({
  onDone,
  lang = "es-ES",
  placeholder = "Dicta aquí tu nota (mantén pulsado o usa manos libres)…",
}: {
  onDone: (texto: string) => void;
  lang?: string;
  placeholder?: string;
}) {
  const { supported, listening, text, setText, start, stop, reset } = useSpeech(lang);
  const [handsFree, setHandsFree] = useState(false);

  if (!supported) {
    // Degradación: textarea simple si el navegador no soporta Web Speech
    return (
      <div className="space-y-2">
        <textarea
          rows={3}
          value={text}
          placeholder="Tu navegador no soporta dictado. Escribe aquí…"
          onChange={(e) => setText(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded bg-black text-white"
            onClick={() => { onDone(text.trim()); reset(); }}
          >
            Usar texto
          </button>
          <button type="button" className="px-3 py-2 rounded" onClick={reset}>
            Limpiar
          </button>
        </div>
      </div>
    );
  }

  const finish = () => {
    stop();
    const t = text.trim();
    if (t) onDone(t);
    reset();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mantener para hablar (desktop/móvil) */}
        <button
          type="button"
          onPointerDown={() => !handsFree && start()}
          onPointerUp={() => !handsFree && finish()}
          onPointerLeave={() => !handsFree && stop()}
          className={`px-4 py-2 rounded-2xl shadow border select-none ${
            listening ? "ring-4 ring-sky-300" : ""
          }`}
          title="Mantén pulsado para dictar"
        >
          🎤 Mantener para hablar
        </button>

        {/* Manos libres */}
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={handsFree}
            onChange={(e) => {
              const v = e.target.checked;
              setHandsFree(v);
              if (v) start(); else stop();
            }}
          />
          Modo manos libres
        </label>

        {/* Estado */}
        <span className="text-sm text-gray-600">
          {listening ? "Escuchando…" : "Listo"}
        </span>
      </div>

      <textarea
        rows={3}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded bg-black text-white"
          onClick={finish}
          disabled={!text.trim()}
        >
          Usar dictado
        </button>
        <button type="button" className="px-3 py-2 rounded" onClick={reset}>
          Limpiar
        </button>
      </div>
    </div>
  );
}
