import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useUmiDialog } from "./UmiDialogProvider";
import "./UmiManagement.css";
export default function Privacy({ onBack, editable = false }) {
  const [text, setText] = useState(""), [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const { umiAlert, umiConfirm } = useUmiDialog();
  useEffect(() => onSnapshot(doc(db, "appSettings", "privacy"), (snapshot) => {
    setText(snapshot.data()?.text || ""); setError("");
  }, () => setError("Impossible de charger la politique de confidentialité.")), []);
  const save = async () => {
    if (busy || !draft.trim()) { if (!draft.trim()) await umiAlert("Renseignez le texte de confidentialité."); return; }
    if (!await umiConfirm("Publier cette politique de confidentialité pour les clients ?", { title: "Confidentialité UMI" })) return;
    setBusy(true);
    try {
      const user = auth.currentUser;
      if (!user || !editable) throw new Error("Connectez-vous comme administrateur.");
      const profile = await getDoc(doc(db, "users", user.uid));
      if (!profile.exists() || profile.data().role !== "admin" || profile.data().blocked || profile.data().deleting) {
        throw new Error("La modification est réservée à un compte administrateur actif.");
      }
      await setDoc(doc(db, "appSettings", "privacy"), {
        text: draft.trim(), updatedAt: serverTimestamp(), updatedBy: user.uid,
      });
      setText(draft.trim());
      setEditing(false); await umiAlert("La confidentialité a été mise à jour.");
    } catch (e) {
      await umiAlert(e.code === "permission-denied"
        ? "Enregistrement refusé. La règle Firestore de confidentialité doit autoriser l’administrateur à modifier appSettings/privacy."
        : e.message || "Impossible d’enregistrer le texte. Votre texte reste dans le formulaire.");
    }
    finally { setBusy(false); }
  };
  return <div className="umi-management"><header><button onClick={onBack}>‹ Retour</button><h1>Confidentialité</h1></header>
    {error && <p role="alert">{error}</p>}
    {editing ? <><label htmlFor="umi-privacy-text">Politique de confidentialité</label><textarea id="umi-privacy-text" rows={18} maxLength={60000} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy} /><div className="umi-management-actions"><button onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button><button disabled={busy} onClick={() => setEditing(false)}>Annuler</button></div></>
      : <><article style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.7, color: "#163a5c", fontSize: 16 }}>{text || "La politique de confidentialité n’a pas encore été publiée."}</article>{editable && <button onClick={() => { setDraft(text); setEditing(true); }}>Modifier la confidentialité</button>}</>}
  </div>;
}
