import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import SellerSales from "./SellerSales";
import { umiAlert as umiNotify } from "./umiDialogs";
import "./AdminOrders.css";

const STATUSES = ["Nouvelle", "paid", "Confirmée", "En préparation", "Expédiée", "Livrée", "Annulée"];
const statusLabel = (status) => status === "paid" ? "Payée" : status || "Nouvelle";
const statusTone = (status) => ({ Nouvelle: "new", paid: "paid", Confirmée: "confirmed", "En préparation": "preparing", Expédiée: "shipped", Livrée: "delivered", Annulée: "cancelled" }[status || "Nouvelle"] || "new");
const clientName = (order) => order.buyerInfo?.fullName || [order.buyerInfo?.prenom, order.buyerInfo?.nom].filter(Boolean).join(" ") || order.clientName || order.userName || [order.firstName || order.prenom || order.customer?.prenom, order.lastName || order.nom || order.customer?.nom].filter(Boolean).join(" ") || "Client UMI";
const money = (value, currency = "FCFA") => `${(Number.isFinite(Number(value)) ? Number(value) : 0).toLocaleString("fr-FR")} ${currency}`;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function orderDate(value) {
  const date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "Date non renseignée";
}

export default function AdminOrders({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("orders");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState({});
  const pending = useRef(new Set());

  useEffect(() => onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
    setOrders(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })));
    setError(""); setLoading(false);
  }, (failure) => {
    console.error("Erreur chargement commandes :", failure);
    setError("Impossible de charger les commandes. Vérifiez votre connexion et votre accès administrateur.");
    setLoading(false);
  }), []);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const term = normalize(search.trim());
    return (filter === "all" || (order.status || "Nouvelle") === filter) && (!term || normalize(`${order.id} ${clientName(order)} ${order.buyerInfo?.telephone || order.phone || order.telephone || ""}`).includes(term));
  }), [orders, search, filter]);
  const newCount = orders.filter((order) => !order.status || order.status === "Nouvelle").length;
  const ongoingCount = orders.filter((order) => ["paid", "Confirmée", "En préparation", "Expédiée"].includes(order.status)).length;

  const changeStatus = async (order, status) => {
    if (pending.current.has(order.id) || status === (order.status || "Nouvelle")) return;
    pending.current.add(order.id);
    setSaving((current) => ({ ...current, [order.id]: true }));
    try {
      await updateDoc(doc(db, "orders", order.id), { status, statusUpdatedAt: serverTimestamp() });
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    } catch (failure) {
      console.error("Erreur modification statut :", failure);
      await umiNotify("Le statut n’a pas pu être enregistré. Réessayez.");
    } finally {
      pending.current.delete(order.id);
      setSaving((current) => ({ ...current, [order.id]: false }));
    }
  };

  return <main className="umi-admin-orders">
    <div className="ao-container">
      <header className="ao-header">
        <button type="button" className="ao-back" onClick={onBack} aria-label="Retour">←</button>
        <div><span className="ao-eyebrow">ADMINISTRATION UMI</span><h1>Mes commandes</h1><p>Suivez les achats et leur avancement.</p></div>
      </header>
      <nav className="ao-tabs" aria-label="Commandes et ventes">
        <button type="button" className={tab === "orders" ? "active" : ""} aria-pressed={tab === "orders"} onClick={() => setTab("orders")}>Les commandes <span>{loading ? "…" : orders.length}</span></button>
        <button type="button" className={tab === "sales" ? "active" : ""} aria-pressed={tab === "sales"} onClick={() => setTab("sales")}>Ventes des clients</button>
      </nav>
      {tab === "sales" ? <div className="ao-sales"><SellerSales admin /></div> : <>
        <section className="ao-stats" aria-label="Résumé des commandes">
          <div><span>Total</span><strong>{loading ? "—" : orders.length}</strong></div>
          <div><span>Nouvelles</span><strong>{loading ? "—" : newCount}</strong></div>
          <div><span>En cours</span><strong>{loading ? "—" : ongoingCount}</strong></div>
        </section>
        <section className="ao-filters" aria-label="Filtrer les commandes">
          <label className="ao-search"><span>Rechercher une commande</span><input type="search" placeholder="Client, numéro ou téléphone…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="ao-status-filter"><span>Statut</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tous les statuts</option>{STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
        </section>
        {loading ? <div className="ao-empty" role="status"><strong>Chargement des commandes…</strong><p>Votre liste sera disponible dans un instant.</p></div> : error ? <div className="ao-empty ao-error" role="alert">{error}</div> : <>
          <p className="ao-results" aria-live="polite">{visibleOrders.length} commande{visibleOrders.length > 1 ? "s" : ""}{filter !== "all" || search ? " trouvée" + (visibleOrders.length > 1 ? "s" : "") : " au total"}</p>
          {!visibleOrders.length ? <div className="ao-empty"><strong>{orders.length ? "Aucun résultat" : "Aucune commande pour le moment"}</strong><p>{orders.length ? "Essayez un autre nom ou un autre statut." : "Les nouvelles commandes apparaîtront ici."}</p>{orders.length > 0 && <button type="button" className="ao-reset" onClick={() => { setSearch(""); setFilter("all"); }}>Afficher toutes les commandes</button>}</div> : <div className="ao-list">{visibleOrders.map((order) => {
            const buyer = order.buyerInfo || order.customer || {};
            const phone = buyer.telephone || order.phone || order.telephone;
            const email = buyer.email || order.email;
            const address = buyer.adresse || order.address || order.adresse;
            const delivery = buyer.lieuLivraison || order.deliveryLocation || order.lieuLivraison || order.location;
            const items = Array.isArray(order.items) ? order.items : Array.isArray(order.cartItems) ? order.cartItems : [];
            const status = order.status || "Nouvelle";
            return <article className="ao-card" key={order.id}>
              <div className="ao-card-top"><div><span className="ao-order-number">Commande #{order.id.slice(0, 8)}</span><span className="ao-date">{orderDate(order.createdAt)}</span></div><span className={`ao-badge ao-badge-${statusTone(status)}`}>{statusLabel(status)}</span></div>
              <div className="ao-client-row"><div className="ao-avatar" aria-hidden="true">{clientName(order).trim().charAt(0).toUpperCase()}</div><div><span className="ao-field-label">Client</span><h2>{clientName(order)}</h2>{phone && <p>{phone}</p>}</div></div>
              <div className="ao-total"><span>Total de la commande</span><strong>{money(order.total, order.currency || "FCFA")}</strong></div>
              <div className="ao-status-row"><label htmlFor={`ao-status-${order.id}`}>Avancement</label><select id={`ao-status-${order.id}`} value={status} disabled={Boolean(saving[order.id])} onChange={(event) => changeStatus(order, event.target.value)}>{!STATUSES.includes(status) && <option value={status}>{statusLabel(status)}</option>}{STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select>{saving[order.id] && <span className="ao-saving" role="status">Enregistrement…</span>}</div>
              <details className="ao-details"><summary>Voir les détails</summary><div className="ao-detail-content"><dl><div><dt>Numéro complet</dt><dd>{order.id}</dd></div>{email && <div><dt>E-mail</dt><dd>{email}</dd></div>}{address && <div><dt>Adresse</dt><dd>{address}</dd></div>}{delivery && <div><dt>Livraison</dt><dd>{delivery}</dd></div>}</dl>{items.length > 0 && <div className="ao-items"><h3>Articles commandés</h3>{items.map((item, index) => <div key={`${item.id || "item"}-${index}`}><span>{item.name || item.machineName || item.title || "Article"}{item.modelName && <small>{item.modelName}</small>}</span><strong>× {item.quantity ?? 1}</strong></div>)}</div>}</div></details>
            </article>;
          })}</div>}
        </>}
      </>}
    </div>
  </main>;
}
