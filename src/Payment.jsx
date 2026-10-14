import { auth } from "./firebase";
import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useState } from "react";

import "./Payment.css";

function Payment({

  cart = [],
  embedded = false,

  user,

  buyerInfo,

  onBack,

  onHome,

  onOpenMachines,

  onOpenUmiLive,

  onOpenCart,

  onOpenAccount,

}) {

  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Carte bancaire sélectionnée automatiquement

  const [selectedMethod, setSelectedMethod] = useState("card");

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

      if (

        value.lastIndexOf(",") >

        value.lastIndexOf(".")

      ) {

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

    return Number.isFinite(number)

      ? number

      : null;

  };

  const total = cart.reduce((sum, item) => {
    const price = getNumericPrice(item?.price);
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    return sum + (price !== null && price >= 0 ? price * quantity : 0);
  }, 0);

  /* =========================================

     FORMATER LE PRIX

  ========================================= */

 const formatPrice = (amount) => {
  if (
    amount === null ||
    amount === undefined ||
    !Number.isFinite(amount)
  ) {
    return "Prix non renseigné";
  }

  const formattedAmount =
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(amount);

  return `${formattedAmount} FCFA`;
};
  /* =========================================

     CONTINUER LE PAIEMENT

  ========================================= */

  const handleContinuePayment = async () => {

    if (processing || !selectedMethod) {

      return;

    }

    if (!total || total <= 0) {

      await umiNotify(

        "Le montant de la commande est invalide."

      );

      return;

    }

    setProcessing(true);
    setPaymentError("");
    try {

      if (!auth.currentUser) throw new Error("Connectez-vous avant le paiement.");
      const identityToken = await auth.currentUser.getIdToken();
      // PayDunya uniquement

      const paymentApiUrl =

        import.meta.env.VITE_UMI_PAYMENT_API_URL || "https://grocery-jpeg-infinite-sphere.trycloudflare.com/api/payments/paydunya/create";

      const response = await fetch(

        paymentApiUrl,

        {

          method: "POST",

          headers: {

            "Content-Type": "application/json",
            Authorization: `Bearer ${identityToken}`,

          },

          body: JSON.stringify({

            amount: total,

            paymentMethod: "card",

            userId: auth.currentUser.uid,

            buyerInfo:

              buyerInfo || null,

            cart: cart.map((machine) => ({
              liveId: machine.liveId || "",
              sellerId: machine.sellerId || machine.ownerId || "",
              sellerName: machine.sellerName || "",
              liveType: machine.liveType || "",
              selectedModelId: machine.selectedModelId || "",
              isLiveOffer: machine.isLiveOffer === true,

              id:

                machine?.id || "",

              name:

                machine?.name || "",

              price:

                getNumericPrice(

                  machine?.price

                ),

              quantity: Math.max(

                1,

                Number(

                  machine?.quantity

                ) || 1

              ),

              image:

                machine?.image ||

                machine?.imageUrl ||

                machine?.photo ||

                "",

              category:

                machine?.category || "",

            })),

          }),

        }

      );

      const rawResponse =

        await response.text();

      console.log(

        "RÉPONSE SERVEUR UMI :",

        rawResponse

      );

      let data;

      try {

        data = JSON.parse(rawResponse);

      } catch (error) {

        throw new Error(

          "Le serveur UMI a retourné une réponse invalide."

        );

      }

      console.log(

        "Réponse paiement UMI :",

        data

      );

      if (

        !response.ok ||

        !data.success

      ) {

        throw new Error(

          data?.message ||

            "Impossible de démarrer le paiement."

        );

      }

      if (!data.redirectUrl) {

        throw new Error(

          "PayDunya n'a pas retourné l'adresse de paiement."

        );

      }

      const paymentDestination = new URL(data.redirectUrl);
      if (paymentDestination.protocol !== "https:") throw new Error("L’adresse de paiement n’est pas sécurisée.");
      window.location.href = paymentDestination.href;

    } catch (error) {

      console.error(

        "Erreur paiement UMI :",

        error

      );

      setPaymentError(error?.message || "Impossible de démarrer le paiement.");
      await umiNotify(

        error?.message ||

          "Impossible de démarrer le paiement."

      );

    } finally { setProcessing(false); }

  };

  return (

    <div className={embedded ? "payment-page payment-embedded" : "payment-page"}
      style={embedded ? { minHeight: 0, paddingBottom: 0 } : undefined}>

      {/* EN-TÊTE */}

      <header className="payment-header">

        <button

          type="button"

          className="payment-back"

          onClick={() => checkoutUrl ? setCheckoutUrl("") : onBack?.()}

        >

          ←

        </button>

        <h1>Paiement</h1>

        <div className="payment-header-icon">

          🔒

        </div>

      </header>

      {/* CONTENU */}

      {paymentError && (
        <div role="alert" style={{ margin: 16, padding: 12, borderRadius: 12, background: "#fff0f0", color: "#a51d1d" }}>
          {paymentError}
        </div>
      )}

      {checkoutUrl ? (
        <section style={{ padding: "0 12px 12px" }}>
          <iframe
            src={checkoutUrl}
            title="Paiement sécurisé PayDunya"
            allow="payment"
            style={{ display: "block", width: "100%", height: "65dvh", border: 0, borderRadius: 12, background: "white" }}
          />
        </section>
      ) : (
      <>
      <main className="payment-content">

        {/* MONTANT */}

        <section className="payment-total-card">

          <span>

            Montant à payer

          </span>

          <strong>

            {formatPrice(total)}

          </strong>

          <small>

            Paiement sécurisé

          </small>

        </section>

        {/* MOYEN DE PAIEMENT */}

        <section className="payment-section">

          <h2>

            Moyen de paiement

          </h2>

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

              <strong>

                Carte bancaire

              </strong>

              <small>

                Visa, Mastercard

              </small>

            </div>

            <div className="payment-radio">

              {selectedMethod === "card"

                ? "✓"

                : ""}

            </div>

          </button>

        </section>

        {/* SÉCURITÉ */}

        <div className="payment-security">

          <span>

            🔐

          </span>

          <p>

            Votre commande sera confirmée

            uniquement après validation réelle

            du paiement par le service de paiement.

          </p>

        </div>

      </main>

      {/* BARRE DU BAS */}

      <div className="payment-bottom"
        style={embedded ? { position: "sticky", bottom: 0, left: "auto", width: "100%", maxWidth: "none", transform: "none" } : undefined}>

        <div className="payment-bottom-total">

          <span>

            Total

          </span>

          <strong>

            {formatPrice(total)}

          </strong>

        </div>

        <button

          type="button"

          className="payment-continue-button"

          disabled={!selectedMethod || processing || !cart.length || total <= 0}

          onClick={handleContinuePayment}

        >

          {processing ? "Préparation…" : "Continuer"}

        </button>

      </div>

      {/* =========================================

          BARRE DE NAVIGATION

      ========================================= */}

      </>
      )}

      {!embedded && <nav className="bottom-nav">

        <button

          type="button"

          className="nav-item"

          onClick={onHome}

        >

          <span>🏠</span>

          <p>Accueil</p>

        </button>

        <button

          type="button"

          className="nav-item"

          onClick={onOpenMachines}

        >

          <span>▦</span>

          <p>Catégories</p>

        </button>

        <button

          type="button"

          className="nav-item live-nav"

          onClick={onOpenUmiLive}

        >

          <span className="bottom-live-icon">

            ▶

          </span>

          <p>UMI LIVE</p>

        </button>

        <button

          type="button"

          className="nav-item"

          onClick={onOpenCart}

        >

          <span>🛒</span>

          <p>Panier</p>

        </button>

        <button

          type="button"

          className="nav-item"

          onClick={onOpenAccount}

        >

          <span className="bottom-account-photo-wrapper">

            {user?.photoURL ||

            user?.photoUrl ||

            user?.photo ? (

              <img

                src={

                  user.photoURL ||

                  user.photoUrl ||

                  user.photo

                }

                alt="Compte"

                className="bottom-account-photo"

              />

            ) : (

              <span className="bottom-account-placeholder">

                👤

              </span>

            )}

          </span>

          <p>Compte</p>

        </button>

      </nav>}

    </div>

  );

}

export default Payment;
