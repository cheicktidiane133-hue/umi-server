import { useEffect } from "react";
import "./PaymentSuccess.css";

function PaymentSuccess({
  orderNumber = "",
  amount = 0,
  currency = "FCFA",
  paymentMethod = "",
  onDownloadInvoice,
  onHome,
}) {
  const formatPrice = (value) => {
    const number = Number(value) || 0;

    const formatted = new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(number);

    return `${formatted} ${currency}`;
  };

  const getPaymentMethodName = () => {
    if (paymentMethod === "card") {
      return "Carte bancaire";
    }

    if (paymentMethod === "orange") {
      return "Orange Money";
    }

    if (paymentMethod === "wave") {
      return "Wave";
    }

    return "Paiement en ligne";
  };

  /* =========================================
     RETOUR AUTOMATIQUE À L'ACCUEIL
  ========================================= */

  useEffect(() => {
    /*
      Plus tard, lorsque PayTech sera réellement
      connecté, nous pourrons activer ici le
      retour automatique à l'accueil après
      téléchargement de la facture.

      Pour l'instant, aucun retour automatique
      n'est déclenché.
    */
  }, []);

  return (
    <div className="payment-success-page">

      <main className="payment-success-content">

        <div className="payment-success-icon">
          ✓
        </div>

        <h1>
          Paiement confirmé
        </h1>

        <p className="payment-success-message">
          Votre paiement a été confirmé avec succès.
        </p>

        <section className="payment-success-card">

          <div className="payment-success-row">
            <span>
              N° de commande
            </span>

            <strong>
              {orderNumber || "—"}
            </strong>
          </div>

          <div className="payment-success-row">
            <span>
              Moyen de paiement
            </span>

            <strong>
              {getPaymentMethodName()}
            </strong>
          </div>

          <div className="payment-success-row payment-success-total">
            <span>
              Montant payé
            </span>

            <strong>
              {formatPrice(amount)}
            </strong>
          </div>

        </section>

        <div className="payment-success-security">
          <span>🔒</span>

          <p>
            Le paiement a été vérifié avant
            la confirmation de cette commande.
          </p>
        </div>

        <button
          type="button"
          className="payment-success-invoice"
          onClick={onDownloadInvoice}
        >
          📄 Télécharger la facture
        </button>

        <button
          type="button"
          className="payment-success-home"
          onClick={onHome}
        >
          Retour à l'accueil
        </button>

      </main>

    </div>
  );
}

export default PaymentSuccess;