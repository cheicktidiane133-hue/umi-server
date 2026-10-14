import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useUmiDialog } from "./UmiDialogProvider";
import "./UmiManagement.css";
export default function AdminAccounts({ onBack }) {
  const [users, setUsers] = useState([]), [search, setSearch] = useState("");
  const [busy, setBusy] = useState(""), [error, setError] = useState("");
  const { umiConfirm, umiAlert } = useUmiDialog();
  useEffect(() => onSnapshot(collection(db, "users"), (snapshot) => {
    setUsers(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
    setError("");
  }, () => setError("Impossible de charger les comptes. Vérifiez les autorisations administrateur.")), []);
  const manage = async (account, action) => {
    if (busy || account.id === auth.currentUser?.uid || account.role === "admin") return;
    const label = action === "delete" ? "Supprimer définitivement" : action === "block" ? "Bloquer" : "Débloquer";
    if (!await umiConfirm(`${label} le compte de ${account.nom || account.email || "cet utilisateur"} ?${action === "delete" ? " La connexion et le profil seront supprimés. Les commandes et devis seront conservés." : ""}`, { title: "Gestion de compte UMI", danger: action !== "unblock" })) return;
    setBusy(account.id);
    try {
      if (!auth.currentUser) throw new Error("Reconnectez-vous comme administrateur.");
      const token = await auth.currentUser.getIdToken();
      const base = (import.meta.env.VITE_UMI_API_URL || "https://umi-server.onrender.com").replace(/\/+$/, "");
      const response = await fetch(`${base}/admin/accounts/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: account.id, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) {
        throw new Error(result.error || (response.status === 404
          ? "Mettez à jour le serveur UMI : la gestion des comptes n’est pas encore disponible."
          : "Impossible de modifier ce compte."));
      }
      await umiAlert(action === "delete" ? "Compte supprimé." : action === "block" ? "Compte bloqué." : "Compte débloqué.");
    } catch (e) {
      await umiAlert(e.message || "Impossible de joindre le serveur UMI. Réessayez.");
    } finally { setBusy(""); }
  };
  const visible = users.filter((u) => `${u.nom || ""} ${u.email || ""} ${u.telephone || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="umi-management"><header><button onClick={onBack}>‹ Retour</button><h1>Gestion des comptes</h1></header>
    <input type="search" placeholder="Rechercher un nom, e-mail ou téléphone" value={search} onChange={(e) => setSearch(e.target.value)} />
    {error && <p role="alert">{error}</p>}<p>{visible.length} compte(s)</p>
    {visible.map((u) => <article key={u.id}><strong>{u.nom || "Utilisateur"}</strong><p>{u.email}</p><small>{u.role === "admin" ? "Administrateur" : u.blocked ? "Compte bloqué" : "Compte actif"}</small>
      {u.role !== "admin" && u.id !== auth.currentUser?.uid && <div className="umi-management-actions"><button disabled={Boolean(busy)} onClick={() => manage(u, u.blocked ? "unblock" : "block")}>{busy === u.id ? "Traitement…" : u.blocked ? "Débloquer" : "Bloquer"}</button><button className="danger" disabled={Boolean(busy)} onClick={() => manage(u, "delete")}>Supprimer</button></div>}
    </article>)}
  </div>;
}
