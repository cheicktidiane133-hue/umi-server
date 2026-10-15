import { Capacitor } from "@capacitor/core";
import {
  onSnapshot,
  Timestamp,
  GeoPoint,
  Bytes,
  doc,
} from "firebase/firestore";

function showDiagnostic(message) {
  let panel = document.getElementById(
    "umi-machines-diagnostic"
  );

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "umi-machines-diagnostic";

    Object.assign(panel.style, {
      position: "fixed",
      top: "110px",
      left: "10px",
      right: "10px",
      zIndex: "2147483647",
      padding: "12px",
      background: "#d1ecf1",
      color: "#000",
      fontSize: "14px",
      whiteSpace: "pre-wrap",
      pointerEvents: "none",
    });

    document.body.appendChild(panel);
  }

  panel.textContent = message;
}

// Convertir les valeurs REST au format attendu par l'application.
function decodeValue(value, db) {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;

  if ("integerValue" in value) {
    return Number(value.integerValue);
  }

  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }

  if ("timestampValue" in value) {
    return Timestamp.fromDate(
      new Date(value.timestampValue)
    );
  }

  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(
      (item) => decodeValue(item, db)
    );
  }

  if ("mapValue" in value) {
    return decodeFields(value.mapValue.fields || {}, db);
  }

  if ("geoPointValue" in value) {
    return new GeoPoint(
      value.geoPointValue.latitude,
      value.geoPointValue.longitude
    );
  }

  if ("bytesValue" in value) {
    return Bytes.fromBase64String(value.bytesValue);
  }

  if ("referenceValue" in value) {
    const path = value.referenceValue.split(
      "/documents/"
    )[1];

    return doc(db, path);
  }

  throw new Error("Type de donnée Firestore inconnu.");
}

function decodeFields(fields, db) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      decodeValue(value, db),
    ])
  );
}

export function watchMachines(reference, onData, onError) {
  if (Capacitor.getPlatform() !== "ios") {
    return onSnapshot(reference, onData, onError);
  }

  let stopped = false;
  let loading = false;
  let retryTimer;
  let controller;

  const db = reference.firestore;
  const { projectId, apiKey } = db.app.options;

  async function loadMachines() {
    if (stopped || loading) return;

    loading = true;
    clearTimeout(retryTimer);

    showDiagnostic("Machines V3 : chargement direct…");

    try {
      const documents = [];
      let pageToken = "";

      do {
        if (stopped) return;

        const path = reference.path
          .split("/")
          .map(encodeURIComponent)
          .join("/");

        const url = new URL(
          `https://firestore.googleapis.com/v1/projects/${projectId}` +
          `/databases/(default)/documents/${path}`
        );

        url.searchParams.set("key", apiKey);
        url.searchParams.set("pageSize", "100");

        if (pageToken) {
          url.searchParams.set("pageToken", pageToken);
        }

        controller = new AbortController();

        const timeout = setTimeout(
          () => controller.abort(),
          25000
        );

        let data;

        try {
          const response = await fetch(url.toString(), {
            signal: controller.signal,
          });

          data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error?.message ||
              `Erreur HTTP ${response.status}`
            );
          }
        } finally {
          clearTimeout(timeout);
        }

        documents.push(...(data.documents || []));
        pageToken = data.nextPageToken || "";
      } while (pageToken);

      if (stopped) return;

      const docs = documents.map((document) => {
        const fields = decodeFields(
          document.fields || {},
          db
        );

        return {
          id: document.name.split("/").pop(),
          data: () => fields,
        };
      });

      // Format utilisé par le callback actuel de App.jsx.
      onData({
        docs,
        size: docs.length,
        empty: docs.length === 0,
      });

      showDiagnostic(
        `Machines V3 : ${docs.length} transmises à App.`
      );
    } catch (error) {
      if (!stopped) {
        showDiagnostic(
          `Machines V3 : erreur\n${error.message || error}`
        );

        console.error("Chargement direct machines :", error);

        retryTimer = setTimeout(loadMachines, 10000);
        onError?.(error);
      }
    } finally {
      loading = false;
    }
  }

  function handleVisibility() {
    if (document.visibilityState === "visible") {
      loadMachines();
    }
  }

  loadMachines();

  document.addEventListener(
    "visibilitychange",
    handleVisibility
  );

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    controller?.abort();

    document.removeEventListener(
      "visibilitychange",
      handleVisibility
    );
  };
}