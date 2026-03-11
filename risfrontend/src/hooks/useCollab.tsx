// src/hooks/useCollab.tsx
import { useEffect, useRef, useState } from "react";
import { initSocket, getSocket } from "../services/socket";

export default function useCollab(sessionId: string | null, user: any) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!sessionId) return;
    const s = initSocket();
    socketRef.current = s;

    s.emit('collab.join', { sessionId, user });
    setConnected(true);

    s.on('connect', () => setConnected(true));
    s.on('collab.update', (payload:any) => {
      // let consumer decide
      document.dispatchEvent(new CustomEvent('collab.update', { detail: payload }));
    });

    return () => {
      s.emit('collab.leave', { sessionId, user });
      // keep socket for reuse if you want
    };
  }, [sessionId]);

  return { connected, socketRef };
}
