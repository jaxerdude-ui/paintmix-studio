"use client";
import { useEffect, useRef, useState } from "react";

export function parseScaleLine(line) {
  const match = line.match(/Weight:\s*(-?\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function useBrowserScale() {
  const [weight, setWeight] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(null);
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const stopping = useRef(false);

  async function disconnect() {
    stopping.current = true;
    const reader = readerRef.current;
    if (reader) { try { await reader.cancel(); } catch {} }
    const port = portRef.current;
    if (port && !reader) { try { await port.close(); } catch {} portRef.current = null; }
    setConnected(false); setWeight(null);
  }

  async function connect() {
    if (!navigator.serial) { setError("Use desktop Chrome or Edge to connect the USB scale."); return; }
    setConnecting(true); setError(""); setWeight(null); stopping.current = false;
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setConnected(true);
      const reader = port.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      (async () => {
        try {
          while (!stopping.current) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop().slice(-4096);
            for (const line of lines) {
              const reading = parseScaleLine(line);
              if (reading !== null && Number.isFinite(reading)) setWeight(reading);
            }
          }
        } catch {
          if (!stopping.current) setError("The scale connection was interrupted. Stop pouring and reconnect the scale.");
        } finally {
          reader.releaseLock(); readerRef.current = null;
          try { await port.close(); } catch {}
          if (portRef.current === port) portRef.current = null;
          setConnected(false); setWeight(null);
        }
      })();
    } catch (error) {
      setConnected(false);
      if (error.name !== "NotFoundError") setError("Could not connect. Close any other app using the scale, then try Connect Scale again.");
    } finally { setConnecting(false); }
  }

  useEffect(() => {
    setSupported(Boolean(navigator.serial));
    const serial = navigator.serial;
    const lost = () => { if (portRef.current) { setConnected(false); setWeight(null); setError("Scale disconnected. Stop pouring and reconnect it."); } };
    serial?.addEventListener("disconnect", lost);
    return () => { serial?.removeEventListener("disconnect", lost); stopping.current = true; readerRef.current?.cancel().catch(() => {}); };
  }, []);
  return { weight, connected, connecting, error, supported, connect, disconnect };
}
