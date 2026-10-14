import { useEffect, useRef, useState } from "react";

export default function DraggableMessageBubble({ count = 0, onOpen }) {
  const button = useRef(null), gesture = useRef(null), suppressClick = useRef(false);
  const [position, setPosition] = useState(null);
  const clamp = (x, y) => ({
    x: Math.max(8, Math.min(x, window.innerWidth - 62)),
    y: Math.max(8, Math.min(y, window.innerHeight - 62)),
  });
  useEffect(() => {
    const resize = () => setPosition((old) => old ? clamp(old.x, old.y) : old);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const finish = (event) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    suppressClick.current = current.moved;
    gesture.current = null;
  };
  return <button ref={button} type="button" className="umi-client-message-bubble"
    aria-label="Ouvrir les messages dans une fenêtre"
    style={{ touchAction: "none", userSelect: "none", ...(position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : {}) }}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      const rect = button.current.getBoundingClientRect();
      suppressClick.current = false;
      gesture.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: rect.left, y: rect.top, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      const dx = event.clientX - current.startX, dy = event.clientY - current.startY;
      if (Math.hypot(dx, dy) > 6) current.moved = true;
      if (current.moved) setPosition(clamp(current.x + dx, current.y + dy));
    }}
    onPointerUp={finish} onPointerCancel={finish}
    onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onOpen(); }}>
    💬{count > 0 && <span>{count > 99 ? "99+" : count}</span>}
  </button>;
}
