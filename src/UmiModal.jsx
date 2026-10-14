import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./UmiModal.css";
export default function UmiModal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus?.();
    };
  }, []);
  return createPortal(
    <dialog ref={ref} className={`umi-modal ${wide ? "umi-modal-wide" : ""}`} aria-label={title} onCancel={(event) => { event.preventDefault(); closeRef.current(); }} onClick={(event) => { if (event.target === ref.current) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeRef.current(); } }}>
      <header className="umi-modal-header"><strong>{title}</strong><button type="button" aria-label="Fermer la fenêtre" onClick={onClose}>×</button></header>
      <div className="umi-modal-content">{children}</div>
    </dialog>, document.body
  );
}
