import { useEffect, useRef, useState } from "react";

export const clampPosition = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export default function LiveTextOverlay({ value, editable = false, onCommit }) {
  const layerRef = useRef(null);
  const dragRef = useRef(null);
  const [position, setPosition] = useState({ x: clampPosition(value?.x ?? 0.1), y: clampPosition(value?.y ?? 0.3) });
  useEffect(() => {
    if (!dragRef.current) setPosition({ x: clampPosition(value?.x ?? 0.1), y: clampPosition(value?.y ?? 0.3) });
  }, [value?.x, value?.y, value?.text]);
  if (!value?.text) return null;
  const finish = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onCommit?.({ ...value, ...drag.position });
  };
  return <div ref={layerRef} style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "none" }}>
    <div
      aria-label={editable ? "Texte du live, déplaçable" : "Texte du présentateur"}
      onPointerDown={editable ? (event) => {
        if (event.button !== 0) return;
        const frame = layerRef.current.getBoundingClientRect();
        const text = event.currentTarget.getBoundingClientRect();
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: position.x, y: position.y, width: Math.max(1, frame.width - text.width), height: Math.max(1, frame.height - text.height), position };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      } : undefined}
      onPointerMove={editable ? (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const next = { x: clampPosition(drag.x + (event.clientX - drag.startX) / drag.width), y: clampPosition(drag.y + (event.clientY - drag.startY) / drag.height) };
        drag.position = next;
        setPosition(next);
      } : undefined}
      onPointerUp={editable ? finish : undefined}
      onPointerCancel={editable ? finish : undefined}
      style={{ position: "absolute", left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: `translate(-${position.x * 100}%, -${position.y * 100}%)`, maxWidth: "80%", padding: "8px 12px", borderRadius: 10, color: "#fff", background: "rgba(0,0,0,.45)", fontSize: "clamp(18px, 4vw, 28px)", fontWeight: 700, whiteSpace: "pre-wrap", overflowWrap: "anywhere", touchAction: "none", userSelect: "none", cursor: editable ? "grab" : "default", pointerEvents: editable ? "auto" : "none" }}
    >{value.text}</div>
  </div>;
}
