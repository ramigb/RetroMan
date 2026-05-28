import { useEffect, useRef, useCallback, useState } from "react";

interface WSMessage {
  type: string;
  payload?: any;
  userIds?: string[];
}

export function useRetroSocket(
  retroId: string | undefined,
  userId: string | undefined,
  onMessage?: (msg: WSMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!retroId || !userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/retro/${retroId}?userId=${userId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        onMessage?.(msg);
      } catch {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [retroId, userId]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected };
}
