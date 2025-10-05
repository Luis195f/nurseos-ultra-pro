// apps/web/src/components/voice/useSpeech.ts
import { useEffect, useRef, useState } from "react";

type SR = typeof window extends any ? (SpeechRecognition & { lang: string }) : any;

export function useSpeech(lang: string = "es-ES") {
  const [supported, setSupported] = useState<boolean>(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    const W = window as any;
    const SRCls = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SRCls) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const rec: SR = new SRCls();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        final += e.results[i][0].transcript + " ";
      }
      setText(final.trim());
    };
    rec.onend = () => {
      setListening(false);
    };
    rec.onerror = () => {
      setListening(false);
    };

    recRef.current = rec as SR;
    return () => {
      try { recRef.current?.stop(); } catch {}
      recRef.current = null;
    };
  }, [lang]);

  const start = () => {
    if (!recRef.current) return;
    try {
      recRef.current.start();
      setListening(true);
    } catch { /* evita crash si ya estaba corriendo */ }
  };

  const stop = () => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch {}
  };

  const reset = () => setText("");

  return { supported, listening, text, setText, start, stop, reset };
}
