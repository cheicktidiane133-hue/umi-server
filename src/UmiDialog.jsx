import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

function UmiDialog({
  open,
  title = "UMI Group",
  message = "",
  confirmText = "OK",
  cancelText = "Annuler",
  showCancel = false,
  danger = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }

      if (previousFocus?.isConnected) {
        previousFocus.focus?.();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <style>
        {`
          .umi-dialog::backdrop {
            background: rgba(15, 23, 42, 0.55);
          }

          .umi-dialog button:focus-visible {
            outline: 3px solid #68a9ed;
            outline-offset: 3px;
          }
        `}
      </style>

      <dialog
        ref={dialogRef}
        className="umi-dialog"
        aria-labelledby="umi-dialog-title"
        aria-describedby="umi-dialog-message"
        onCancel={(event) => {
          event.preventDefault();

          if (showCancel) {
            onCancel?.();
          } else {
            onConfirm?.();
          }
        }}
        style={{
  position: "fixed",
  inset: "0",
  margin: "auto",

  width: "calc(100% - 40px)",
  maxWidth: "380px",
  height: "fit-content",
  maxHeight: "calc(100dvh - 40px)",

  boxSizing: "border-box",
  padding: "24px",

  border: "none",
  borderRadius: "20px",
  background: "#ffffff",

  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",

  fontFamily: "Arial, Helvetica, sans-serif",
  overflowY: "auto",
}}
      >
        <div
          style={{
            marginBottom: "14px",
            color: "#174b91",
            fontSize: "13px",
            fontWeight: "800",
          }}
        >
          UMI GROUP
        </div>

        <h2
          id="umi-dialog-title"
          style={{
            margin: "0 0 12px",
            fontSize: "20px",
            color: "#182b46",
          }}
        >
          {title}
        </h2>

        <p
          id="umi-dialog-message"
          style={{
            margin: "0 0 20px",
            color: "#667085",
            fontSize: "14px",
            lineHeight: "1.5",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          {showCancel && (
            <button
              type="button"
              autoFocus
              onClick={onCancel}
              style={{
                flex: 1,
                minHeight: "44px",
                padding: "12px",
                border: "1px solid #dce4ee",
                borderRadius: "12px",
                background: "#f4f7fb",
                color: "#344761",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            autoFocus={!showCancel}
            onClick={onConfirm}
            style={{
              flex: 1,
              minHeight: "44px",
              padding: "12px",
              border: "none",
              borderRadius: "12px",
              background: danger ? "#e11d48" : "#174b91",
              color: "#ffffff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {confirmText}
          </button>
        </div>
      </dialog>
    </>,
    document.body
  );
}

export default UmiDialog;