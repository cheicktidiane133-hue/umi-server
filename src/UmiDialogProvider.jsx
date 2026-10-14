import { bindUmiDialogs } from "./umiDialogs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import UmiDialog from "./UmiDialog";

const UmiDialogContext = createContext(null);

export function UmiDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const queueRef = useRef([]);
  const activeRef = useRef(null);
  const mountedRef = useRef(true);

  const showNext = useCallback(() => {
    if (
      !mountedRef.current ||
      activeRef.current ||
      !queueRef.current.length
    ) {
      return;
    }

    const next = queueRef.current.shift();

    activeRef.current = next;
    setDialog(next);
  }, []);

  const openDialog = useCallback(
    (options) =>
      new Promise((resolve) => {
        if (!mountedRef.current) {
          resolve(false);
          return;
        }

        queueRef.current.push({
          ...options,
          resolve,
        });

        showNext();
      }),
    [showNext]
  );

  const closeDialog = useCallback(
    (confirmed) => {
      const current = activeRef.current;

      if (!current) return;

      activeRef.current = null;
      setDialog(null);

      current.resolve(confirmed);
      showNext();
    },
    [showNext]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      activeRef.current?.resolve(false);
      activeRef.current = null;

      queueRef.current.forEach((item) => {
        item.resolve(false);
      });

      queueRef.current = [];
    };
  }, []);

  const umiAlert = useCallback(
    (message, options = {}) =>
      openDialog({
        title: options.title || "UMI Group",
        message: String(message ?? ""),
        confirmText: options.confirmText || "OK",
        danger: Boolean(options.danger),
        showCancel: false,
      }),
    [openDialog]
  );

  const umiConfirm = useCallback(
    (message, options = {}) =>
      openDialog({
        title: options.title || "Confirmation",
        message: String(message ?? ""),
        confirmText: options.confirmText || "Confirmer",
        cancelText: options.cancelText || "Annuler",
        danger: Boolean(options.danger),
        showCancel: true,
      }),
    [openDialog]
  );

  useEffect(() => bindUmiDialogs({ umiAlert, umiConfirm }), [umiAlert, umiConfirm]);

  return (
    <UmiDialogContext.Provider
      value={{ umiAlert, umiConfirm }}
    >
      {children}

      <UmiDialog
        open={Boolean(dialog)}
        title={dialog?.title}
        message={dialog?.message}
        confirmText={dialog?.confirmText}
        cancelText={dialog?.cancelText}
        showCancel={dialog?.showCancel}
        danger={dialog?.danger}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(false)}
      />
    </UmiDialogContext.Provider>
  );
}

export function useUmiDialog() {
  const context = useContext(UmiDialogContext);

  if (!context) {
    throw new Error(
      "useUmiDialog doit être utilisé dans UmiDialogProvider."
    );
  }

  return context;
}