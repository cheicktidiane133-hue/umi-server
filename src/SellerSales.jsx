import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
export default function SellerSales({ admin = false, onBack }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!auth.currentUser) { setError("Connectez-vous pour consulter vos ventes."); setLoading(false); return; }
    const source = admin ? collection(db, "sellerSales") : query(collection(db, "sellerSales"), where("sellerId", "==", auth.currentUser.uid));
    return onSnapshot(source, (snapshot) => { setReports(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))); setLoading(false); setError(""); }, () => { setError("Les comptes rendus de vente ne sont pas encore accessibles."); setLoading(false); });
  }, [admin]);
  return <section className="umi-seller-sales" style={{ padding: 18, color: "#163a5c", background: "#f5f7fa" }}>
    {onBack && <button type="button" onClick={onBack}>← Retour</button>}
    <h2>{admin ? "Ventes des clients" : "Mes ventes"}</h2>
    {loading ? <p>Chargement…</p> : error ? <p role="alert">{error}</p> : !reports.length ? <p>Aucune vente avec un paiement confirmé.</p> : reports.map((report) => <article key={report.id} style={{ background: "#fff", padding: 16, borderRadius: 12, marginBottom: 12 }}>
      <strong>Achat effectué chez {report.sellerName || "un vendeur client"}</strong>
      <p>Commande : {report.orderId}</p>
      <p>Paiement confirmé : {Number(report.amount).toLocaleString("fr-FR")} FCFA</p>
      <p>{report.settlementStatus === "paid" ? "Reversement effectué" : "Montant à reverser au vendeur"}</p>
      {(report.items || []).map((item, index) => <p key={index}>{item.name || "Produit"} × {item.quantity}</p>)}
    </article>)}
  </section>;
}
