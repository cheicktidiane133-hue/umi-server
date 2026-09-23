import { useState } from "react";
import "./Payment.css";

function Payment({ cart = [], user, onBack }) {
  const [selectedMethod, setSelectedMethod] = useState("");

  /* =========================================
     CONVERTIR LE PRIX EN NOMBRE
  ========================================= */

  const getNumericPrice = (price) => {
    if (
      price === null ||
      price === undefined ||
      price === ""
    ) {
      return null;
    }

    if (typeof price === "number") {
      return Number.isFinite(price) ? price : null;
    }

    let value = String(price)
      .replace(/\s/g, "")
      .replace(/[^\d.,-]/g, "");

    if (!value) {
      return null;
    }

    const hasComma = value.includes(",");
    const hasDot = value.includes(".");

    if (hasComma && hasDot) {
      if (value.lastIndexOf(",") > value.lastIndexOf(".")) {
        value = value
          .replace(/\./g, "")
          .replace(",", ".");
      } else {
        value = value.replace(/,/g, "");
      }
    } else if (hasComma) {
      const parts = value.split(",");

      if (
        parts.length === 2 &&
        parts[1].length <= 2
      ) {
        value = value.replace(",", ".");
      } else {
        value = value.replace(/,/g, "");
      }
    } else if (hasDot) {
      const parts = value.split(".");

      if (
        parts.length === 2 &&
        parts[1].length === 3
      ) {
        value = value.replace(".", "");
      }
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  };

  /* =========================================
     DEVISE
  ========================================= */

  const getCurrency = (price) => {
    const value = String(price || "").toUpperCase();

    if (
      value.includes("FCFA") ||
      value.includes("CFA")
    ) {
      return "FCFA";
    }

    if (
      value.includes("$") ||
      value.includes("USD")
    ) {
      return "$";
    }

    if (value.includes("CHF")) {
      return "CHF";
    }

    if (
      value.includes("€") ||
      value.includes("EUR")
    ) {
      return "€";
    }

    return "€";
  };

  /* =========================================
     FORMATER LE PRIX
  ========================================= */

  const formatPrice = (amount, currency) => {
    if (
      amount === null ||
      amount === undefined
    ) {
      return "Prix sur demande";
    }

    const formattedAmount =
      new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 2,
      }).format(amount);

    if (currency === "$") {
      return `${formattedAmount} $`;
    }

    return `${formattedAmount} ${currency}`;
  };

  /* =========================================
     TOTAL
  ========================================= */

  const total = cart.reduce(
    (currentTotal, machine) => {
      const unitPrice =
        getNumericPrice(machine?.price);

      const quantity = Math.max(
        1,
        Number(machine?.quantity) || 1
      );

      if (unitPrice === null) {
        return currentTotal;
      }

      return (
        currentTotal +
        unitPrice * quantity
      );
    },
    0
  );

  const firstProductWithPrice =
    cart.find(
      (machine) =>
        getNumericPrice(machine?.price) !== null
    );

  const currency =
    getCurrency(firstProductWithPrice?.price);

  /* =========================================
     CONTINUER LE PAIEMENT
  ========================================= */

  const handleContinuePayment = () => {
    if (!selectedMethod) {
      return;
    }

    /*
      IMPORTANT :

      Aucun paiement réel n'est validé ici.

      Plus tard, cette partie appellera notre
      serveur sécurisé Firebase puis PayTech.

      L'écran "Paiement réussi" ne sera affiché
      qu'après confirmation réelle de PayTech.
    */

    console.log("Paiement UMI à préparer :", {
      method: selectedMethod,
      amount: total,
      currency,
      user,
      cart,
    });

    alert(
      "Le moyen de paiement est sélectionné. " +
      "La connexion au paiement réel PayTech sera activée prochainement."
    );
  };

  return (
    <div className="payment-page">

      {/* EN-TÊTE */}

      <header className="payment-header">
        <button
          type="button"
          className="payment-back"
          onClick={onBack}
        >
          ←
        </button>

        <h1>Paiement</h1>

        <div className="payment-header-icon">
          🔒
        </div>
      </header>

      {/* CONTENU */}

      <main className="payment-content">

        {/* MONTANT */}

        <section className="payment-total-card">
          <span>Montant à payer</span>

          <strong>
            {formatPrice(total, currency)}
          </strong>

          <small>
            Paiement sécurisé
          </small>
        </section>

        {/* MOYENS DE PAIEMENT */}

        <section className="payment-section">

          <h2>Moyen de paiement</h2>

          <p className="payment-subtitle">
            Choisissez comment vous souhaitez
            payer votre commande.
          </p>

          {/* CARTE BANCAIRE */}

          <button
            type="button"
            className={
              selectedMethod === "card"
                ? "payment-method selected"
                : "payment-method"
            }
            onClick={() =>
              setSelectedMethod("card")
            }
          >
            <div className="payment-method-icon payment-card-icon">
              💳
            </div>

            <div className="payment-method-text">
              <strong>Carte bancaire</strong>
              <small>Visa, Mastercard</small>
            </div>

            <div className="payment-radio">
              {selectedMethod === "card"
                ? "✓"
                : ""}
            </div>
          </button>

          {/* ORANGE MONEY */}

          <button
            type="button"
            className={
              selectedMethod === "orange"
                ? "payment-method selected"
                : "payment-method"
            }
            onClick={() =>
              setSelectedMethod("orange")
            }
          >
            <div className="payment-method-icon payment-orange-icon">
              🟠
            </div>

            <div className="payment-method-text">
              <strong>Orange Money</strong>
              <small>Paiement mobile</small>
            </div>

            <div className="payment-radio">
              {selectedMethod === "orange"
                ? "✓"
                : ""}
            </div>
          </button>

          {/* WAVE */}

          <button
            type="button"
            className={
              selectedMethod === "wave"
                ? "payment-method selected"
                : "payment-method"
            }
            onClick={() =>
              setSelectedMethod("wave")
            }
          >
            <div className="payment-method-icon payment-wave-icon">
              🌊
            </div>

            <div className="payment-method-text">
              <strong>Wave</strong>
              <small>Paiement mobile</small>
            </div>

            <div className="payment-radio">
              {selectedMethod === "wave"
                ? "✓"
                : ""}
            </div>
          </button>

        </section>

        {/* SÉCURITÉ */}

        <div className="payment-security">
          <span>🔐</span>

          <p>
            Votre commande sera confirmée
            uniquement après validation réelle
            du paiement par le service de paiement.
          </p>
        </div>

      </main>

      {/* BARRE DU BAS */}

      <div className="payment-bottom">

        <div className="payment-bottom-total">
          <span>Total</span>

          <strong>
            {formatPrice(total, currency)}
          </strong>
        </div>

        <button
          type="button"
          className="payment-continue-button"
          disabled={!selectedMethod}
          onClick={handleContinuePayment}
        >
          Continuer
        </button>

      </div>

    </div>
  );
}

export default Payment;