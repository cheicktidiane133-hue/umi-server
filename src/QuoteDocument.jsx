import React from "react";

import logoUmi from "./assets/logo-umi.jpeg";
import cachetUmi from "./assets/cacher.png";


/* =========================================
   FORMAT PRIX
========================================= */

const money = (value) => {
  const number = Number(value) || 0;

  return `${new Intl.NumberFormat(
    "fr-FR"
  ).format(number)} FCFA`;
};


/* =========================================
   FORMAT DATE
========================================= */

const formatDate = (value) => {
  if (!value) {
    return new Date().toLocaleDateString(
      "fr-FR"
    );
  }

  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return new Date().toLocaleDateString(
        "fr-FR"
      );
    }

    return date.toLocaleDateString(
      "fr-FR"
    );
  } catch {
    return new Date().toLocaleDateString(
      "fr-FR"
    );
  }
};


/* =========================================
   CONSTANTES DU DOCUMENT A4
========================================= */

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;


/*
 * IMPORTANT
 *
 * Ces valeurs correspondent à la place
 * réellement disponible dans les différents
 * types de pages.
 *
 * La dernière page réserve volontairement
 * de la place pour :
 *
 * - sous-total
 * - livraison
 * - total
 * - cachet UMI
 * - informations complémentaires
 * - les 2 blocs du pied de page
 */

const FIRST_PAGE_ROWS = 10;

const CONTINUATION_PAGE_ROWS = 15;

const LAST_FIRST_PAGE_ROWS = 5;

const LAST_CONTINUATION_ROWS = 8;


/* =========================================
   COMPOSANT
========================================= */

function QuoteDocument({
  quote = {},
  user = {},
  documentRef,
  photoPages,
}) {


  /* =========================================
     DEVIS FINAL
  ========================================= */

  const finalQuote =
    quote?.finalQuote || {};

// Photos locales pour l'aperçu admin.
// Photos enregistrées pour le client.
const sourcePhotoPages = Array.isArray(photoPages)
  ? photoPages
  : Array.isArray(finalQuote.photoPages)
    ? finalQuote.photoPages
    : [];

const annexPages = sourcePhotoPages.flatMap(
  (page, pageIndex) => {
    const photos = Array.isArray(page?.photos)
      ? page.photos.filter((photo) => photo?.url)
      : [];

    const result = [];

    for (let index = 0; index < photos.length; index += 6) {
      result.push({
        id: `${page.id || pageIndex}-${index}`,
        photos: photos.slice(index, index + 6),
      });
    }

    return result;
  }
);
  /* =========================================
     CLIENT
  ========================================= */

  const customerName =
    quote?.clientName ||
    quote?.userName ||
    quote?.name ||
    quote?.nom ||
    [user?.prenom, user?.nom]
      .filter(Boolean)
      .join(" ") ||
    "Client UMI";


  const customerPhone =
    quote?.phone ||
    quote?.telephone ||
    quote?.clientPhone ||
    user?.phone ||
    user?.telephone ||
    "";


  const customerEmail =
    quote?.email ||
    quote?.clientEmail ||
    user?.email ||
    "";


  const customerAddress =
    quote?.address ||
    quote?.adresse ||
    quote?.clientAddress ||
    quote?.location ||
    user?.address ||
    user?.adresse ||
    "";


  /* =========================================
     NUMÉRO / DATE
  ========================================= */

  const quoteNumber =
    finalQuote?.quoteNumber ||
    quote?.quoteNumber ||
    "UMI";


  const quoteDate =
    formatDate(
      quote?.respondedAt ||
      quote?.createdAt ||
      new Date()
    );


  /* =========================================
     ARTICLES
  ========================================= */

  let items =
    Array.isArray(finalQuote?.items)
      ? finalQuote.items
      : [];


  /*
   * Si l'ancien devis ne possède pas encore
   * finalQuote.items, on reconstruit au moins
   * la ligne principale.
   */

  if (items.length === 0) {
    items = [
      {
        id: "main",

        name:
          finalQuote?.description ||
          quote?.productName ||
          quote?.product?.name ||
          quote?.subject ||
          "Machine industrielle",

        description:
          finalQuote?.description ||
          quote?.productName ||
          quote?.product?.name ||
          quote?.subject ||
          "Machine industrielle",

        quantity:
          Number(
            finalQuote?.quantity ??
            quote?.quantity ??
            1
          ) || 1,

        unitPrice:
          Number(
            finalQuote?.unitPrice ??
            quote?.unitPrice ??
            0
          ) || 0,
      },
    ];
  }


  /*
   * Nettoyage et normalisation
   * de toutes les lignes.
   */

  items = items.map(
    (item, index) => {

      const quantity =
        Number(item?.quantity) || 0;

      const unitPrice =
        Number(item?.unitPrice) || 0;

      const calculatedTotal =
        quantity * unitPrice;

      return {
        ...item,

        id:
          item?.id ||
          `quote-item-${index}`,

        name:
          item?.name ||
          item?.description ||
          "Article",

        quantity,

        unitPrice,

        total:
          Number(item?.total) ||
          calculatedTotal,
      };
    }
  );


  /* =========================================
     TOTAUX
  ========================================= */

  const productsTotal =
    items.reduce(
      (sum, item) =>
        sum +
        (Number(item?.total) || 0),
      0
    );


  const deliveryCost =
    Number(
      finalQuote?.deliveryCost ??
      finalQuote?.shipping ??
      0
    ) || 0;


  const total =
    Number(finalQuote?.total) ||
    productsTotal +
      deliveryCost;


  /* =========================================
     PIED DE PAGE
  ========================================= */

  const paymentMethods =
    finalQuote?.paymentMethods ||
    `Les paiements peuvent s'effectuer selon votre convenance :
Paiement physique directement au bureau.
Virement ou versement bancaire.
Autres moyens de paiement autorisés par l'entreprise.`;


  const paymentTerms =
    finalQuote?.paymentTerms ||
    `Option A — Matériel déjà disponible (en stock) :
Paiement intégral : 100% à la commande livraison.
Livraison immédiate

Option B — Matériel sur commande :
50% d'acompte à la signature du devis pour validation.
40% d'avance au chargement (au départ / avant l'expédition).
10% de solde à la livraison.
Délai d’expédition : 6 semaines

`;


  /* =========================================
     AJOUTER LES INDEX AUX ARTICLES
  ========================================= */

  const indexedItems =
    items.map(
      (item, index) => ({
        ...item,
        globalIndex: index,
      })
    );


  /* =========================================
     CRÉATION D'UNE PAGE
  ========================================= */

  const createPage = (
    pageItems,
    {
      firstPage = false,
      lastPage = false,
    } = {}
  ) => ({
    items: pageItems,

    firstPage,

    lastPage,
  });


  /* =========================================
     PAGINATION
  =========================================

     RÈGLE :

     1. On vérifie d'abord si tout peut tenir
        sur une seule page avec la zone finale.

     2. Sinon, on remplit la première page.

     3. Les pages intermédiaires sont remplies
        au maximum.

     4. On conserve uniquement la quantité
        nécessaire pour la dernière page.

     Ainsi on évite :

        PAGE 1 : pleine
        PAGE 2 : 2 lignes
        PAGE 3 : plusieurs lignes

     La page intermédiaire doit être utilisée
     avant de créer une nouvelle feuille.
  ========================================= */

    /* =========================================
     PAGINATION DU DEVIS UMI
  ========================================= */

const buildPages = () => {

  const pages = [];

  const remainingItems = [
    ...indexedItems
  ];


  /* =====================================
     RÈGLES DE PAGINATION
  ===================================== */

  const FIRST_PAGE_MAX = 12;

  const FIRST_PAGE_FINAL_MAX = 7;

  const CONTINUATION_PAGE_MAX = 18;

  const LAST_PAGE_MAX = 15;


  /* =====================================
     CAS 1 :
     1 À 7 LIGNES

     TOUT LE DEVIS RESTE
     SUR LA PREMIÈRE PAGE
  ===================================== */

  if (
    remainingItems.length <=
    FIRST_PAGE_FINAL_MAX
  ) {

    return [
      createPage(
        remainingItems,
        {
          firstPage: true,
          lastPage: true,
        }
      ),
    ];
  }


  /* =====================================
     CAS 2 :
     8 LIGNES OU PLUS

     LA PAGE 1 PREND JUSQU'À
     12 LIGNES.

     LA PARTIE FINALE NE SERA
     PLUS SUR LA PAGE 1.
  ===================================== */

  const firstItems =
    remainingItems.splice(
      0,
      FIRST_PAGE_MAX
    );


  pages.push(
    createPage(
      firstItems,
      {
        firstPage: true,
        lastPage: false,
      }
    )
  );


  /* =====================================
     IMPORTANT

     SI LES 8 À 12 LIGNES ONT
     TOUTES ÉTÉ MISES PAGE 1,
     ON CRÉE QUAND MÊME PAGE 2
     POUR :

     - sous-total
     - livraison
     - total
     - cachet
     - informations
     - moyens de paiement
     - conditions
  ===================================== */

  if (
    remainingItems.length === 0
  ) {

    pages.push(
      createPage(
        [],
        {
          firstPage: false,
          lastPage: true,
        }
      )
    );

    return pages;
  }


  /* =====================================
   PAGES 2, 3, 4...

   - Maximum : 16 articles par page.
   - La partie finale reste sur la même
     page s’il y a 10 articles ou moins.
   - Dès le 11e article, la partie finale
     passe sur la page suivante.
===================================== */

const PAGE_MAX = 16;
const FINAL_SAME_PAGE_MAX = 10;

while (remainingItems.length > 0) {

  /* =================================
     10 LIGNES OU MOINS RESTANTES

     TOUT RESTE SUR CETTE PAGE
     + PARTIE FINALE
  ================================= */

  if (
    remainingItems.length <=
    FINAL_SAME_PAGE_MAX
  ) {

    const lastItems =
      remainingItems.splice(
        0,
        remainingItems.length
      );

    pages.push(
      createPage(
        lastItems,
        {
          firstPage: false,
          lastPage: true,
        }
      )
    );

    return pages;
  }


  /* =================================
     PLUS DE 10 LIGNES

     LES ARTICLES PEUVENT CONTINUER
     JUSQU'À 16 LIGNES SUR CETTE PAGE

     LA PARTIE FINALE IRA
     SUR LA PAGE SUIVANTE
  ================================= */

  const pageItems =
    remainingItems.splice(
      0,
      PAGE_MAX
    );

  pages.push(
    createPage(
      pageItems,
      {
        firstPage: false,
        lastPage: false,
      }
    )
  );


  /* =================================
     SI TOUS LES ARTICLES ONT ÉTÉ
     UTILISÉS, CRÉER UNE PAGE
     POUR LA PARTIE FINALE
  ================================= */

  if (
    remainingItems.length === 0
  ) {

    pages.push(
      createPage(
        [],
        {
          firstPage: false,
          lastPage: true,
        }
      )
    );

    return pages;
  }
}


return pages;
};
  /* =========================================
     PAGES FINALES
  ========================================= */

  const pages =
    buildPages();
      /* =========================================
     EN-TÊTE PRINCIPAL — PAGE 1
  ========================================= */

  const renderMainHeader = () => (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%",
          flexShrink: 0,
        }}
      >
        {/* LOGO / ENTREPRISE */}

        <div
          style={{
            width: "48%",
          }}
        >
          <img
            src={logoUmi}
            alt="UMI"
            style={{
              width: "95px",
              height: "auto",
              objectFit: "contain",
              display: "block",
              marginBottom: "8px",
            }}
          />

          <div
            style={{
              fontSize: "11px",
              fontWeight: "900",
              color: "#174b91",
              marginBottom: "3px",
            }}
          >
            UNIVERS DES MACHINES INDUSTRIELLES
          </div>

          <div
            style={{
              fontSize: "8px",
              color: "#606b7b",
              lineHeight: "1.4",
            }}
          >
            Des solutions industrielles pour vos projets
          </div>
        </div>


        {/* DEVIS */}

        <div
          style={{
            width: "45%",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: "28px",
              fontWeight: "900",
              color: "#174b91",
              lineHeight: "1",
              marginBottom: "12px",
            }}
          >
            DEVIS
          </div>

          <div
            style={{
              fontSize: "10px",
              lineHeight: "1.7",
              color: "#4b5563",
            }}
          >
            <strong>
              N° :
            </strong>{" "}
            {quoteNumber}

            <br />

            <strong>
              Date :
            </strong>{" "}
            {quoteDate}
          </div>
        </div>
      </div>


      {/* BARRE BLEUE */}

      <div
        style={{
          width: "100%",
          height: "3px",
          marginTop: "19px",
          backgroundColor: "#174b91",
          flexShrink: 0,
        }}
      />


      {/* =====================================
          FOURNISSEUR / CLIENT
      ===================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          width: "100%",
          boxSizing: "border-box",
          columnGap: "80px",
          marginTop: "20px",
          flexShrink: 0,
        }}
      >
        {/* FOURNISSEUR */}

        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "900",
              color: "#174b91",
              marginBottom: "8px",
            }}
          >
            FOURNISSEUR
          </div>

          <div
            style={{
  fontSize: "13px",
  lineHeight: "1.55",
  color: "#4b5563",
  marginTop: "4px",
}}
          >
           Bamako, Mali
<br />

Site : www.umigroupe.com
<br />

Tél : +223 75 29 29 46 / 65 29 29 46
<br />

Email : umindustrielles.group@gmail.com
          </div>
        </div>


        {/* CLIENT */}

        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "900",
              color: "#174b91",
              marginBottom: "8px",
            }}
          >
            CLIENT
          </div>

          <div
            style={{
              fontSize: "13px",
              fontWeight: "900",
              marginBottom: "5px",
            }}
          >
            {customerName}
          </div>

          <div
            style={{
  fontSize: "12px",
  lineHeight: "1.55",
  color: "#4b5563",
}}
          >
            {customerPhone && (
              <>
                Tél : {customerPhone}
                <br />
              </>
            )}

            {customerEmail && (
              <>
                Email : {customerEmail}
                <br />
              </>
            )}

            {customerAddress && (
              <>
                Adresse : {customerAddress}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );


  /* =========================================
     PETIT EN-TÊTE — PAGES 2, 3...
  ========================================= */

  const renderContinuationHeader =
    (pageNumber) => (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            width: "100%",
            flexShrink: 0,
          }}
        >
          

          <div
            style={{
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "900",
                color: "#174b91",
              }}
            >
              DEVIS — SUITE
            </div>

            <div
              style={{
                marginTop: "4px",
                fontSize: "8px",
                color: "#606b7b",
              }}
            >
              N° {quoteNumber}
              {" — "}
              Page {pageNumber}
            </div>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: "3px",
            marginTop: "14px",
            backgroundColor: "#174b91",
            flexShrink: 0,
          }}
        />
      </>
    );


  /* =========================================
     TABLEAU DES ARTICLES
  ========================================= */

  const renderTable =
    (pageItems, firstPage) => (
      <div
        style={{
          marginTop:
            firstPage
              ? "28px"
              : "24px",

          width: "100%",

          flexShrink: 0,
        }}
      >
        {/* EN-TÊTE DU TABLEAU */}

        <div
          style={{
            height: "40px",

            display: "grid",

            gridTemplateColumns:
              "45px 1fr 75px 125px 125px",

            alignItems: "center",

            backgroundColor: "#174b91",

            color: "#ffffff",

            fontSize: "11px",

            fontWeight: "900",

            textAlign: "center",

            boxSizing: "border-box",
          }}
        >
          <div>
            N°
          </div>

          <div
            style={{
              textAlign: "left",
              paddingLeft: "12px",
            }}
          >
            DÉSIGNATION
          </div>

          <div>
            QTÉ
          </div>

          <div>
            PRIX UNITAIRE
          </div>

          <div>
            TOTAL
          </div>
        </div>


        {/* LIGNES */}

        {pageItems.map(
          (item) => (
            <div
              key={`${item.id}-${item.globalIndex}`}
              style={{
                minHeight: "48px",

                display: "grid",

                gridTemplateColumns:
                  "45px 1fr 75px 125px 125px",

                alignItems: "stretch",

                borderLeft:
                  "1px solid #d8dee8",

                borderRight:
                  "1px solid #d8dee8",

                borderBottom:
                  "1px solid #d8dee8",

                fontSize: "11px",

                textAlign: "center",

                boxSizing: "border-box",

                breakInside: "avoid",

                pageBreakInside: "avoid",
              }}
            >
              {/* NUMÉRO */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  borderRight:
                    "1px solid #e5e7eb",

                  padding: "8px 4px",
                }}
              >
                {item.globalIndex + 1}
              </div>


              {/* DÉSIGNATION */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",

                  textAlign: "left",

                  padding: "8px 12px",

                  fontWeight: "700",

                  overflowWrap: "anywhere",

                  wordBreak: "break-word",

                  borderRight:
                    "1px solid #e5e7eb",

                  lineHeight: "1.3",
                }}
              >
                {item.name}
              </div>


              {/* QUANTITÉ */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  borderRight:
                    "1px solid #e5e7eb",

                  padding: "8px 4px",
                }}
              >
                {item.quantity}
              </div>


              {/* PRIX UNITAIRE */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  borderRight:
                    "1px solid #e5e7eb",

                  padding: "8px 4px",
                }}
              >
                {money(
                  item.unitPrice
                )}
              </div>


              {/* TOTAL */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  padding: "8px 4px",

                  fontWeight: "900",
                }}
              >
                {money(
                  item.total
                )}
              </div>
            </div>
          )
        )}
      </div>
    );
      /* =========================================
     ZONE FINALE DU DEVIS
     UNIQUEMENT SUR LA DERNIÈRE PAGE
  ========================================= */

  const renderFinalSection = () => (
    <>
      {/* =====================================
          TOTAUX
      ===================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "18px",
          width: "100%",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "310px",
          }}
        >
          {/* SOUS-TOTAL */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "7px 0",
              fontSize: "10px",
              borderBottom:
                "1px solid #e1e5eb",
            }}
          >
            <span>
              Sous-total
            </span>

            <strong>
              {money(productsTotal)}
            </strong>
          </div>


          {/* LIVRAISON */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "7px 0",
              fontSize: "10px",
              borderBottom:
                "1px solid #e1e5eb",
            }}
          >
            <span>
              Livraison
            </span>

            <strong>
              {money(deliveryCost)}
            </strong>
          </div>


          {/* TOTAL */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",

              marginTop: "6px",

              padding: "10px 12px",

              backgroundColor: "#174b91",

              color: "#ffffff",

              fontSize: "12px",

              fontWeight: "900",
            }}
          >
            <span>
              TOTAL
            </span>

            <span>
              {money(total)}
            </span>
          </div>
        </div>
      </div>


      {/* =====================================
          CACHET UMI
      ===================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",

          marginTop: "6px",

          paddingRight: "12px",

          flexShrink: 0,
        }}
      >
        <img
          src={cachetUmi}
          alt="Cachet UMI"
          style={{
            width: "105px",
            height: "105px",

            objectFit: "contain",

            display: "block",
          }}
        />
      </div>


   
      {/* =====================================
          ESPACE FLEXIBLE

          C'EST CET ÉLÉMENT QUI POUSSE
          LE PIED DE PAGE JUSQU'EN BAS
          DE LA DERNIÈRE FEUILLE.
      ===================================== */}

      <div
        style={{
          flex: "1 1 auto",
          minHeight: "10px",
        }}
      />


      {/* =====================================
          PIED DE PAGE

          TOUJOURS EN BAS DE
          LA DERNIÈRE FEUILLE
      ===================================== */}

      <div
  className="umi-quote-footer"
  style={{
    width: "100%",
    flexShrink: 0,
    boxSizing: "border-box",
  }}
>

  {/* VALIDITÉ */}
  {finalQuote?.validity && (
    <div
      style={{
        fontSize: "7px",
        color: "#4b5563",
        textAlign: "left",
        marginBottom: "7px",
      }}
    >
      <strong>Validité :</strong>{" "}
      {finalQuote.validity}
    </div>
  )}

  {/* BARRE BLEUE + LES DEUX COLONNES */}
  <div
    style={{
      width: "100%",
      borderTop: "3px solid #174b91",
      paddingTop: "10px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      columnGap: "55px",
      alignItems: "start",
      boxSizing: "border-box",
    }}
  >
        {/* =================================
            BLOC GAUCHE
            MOYENS DE PAIEMENT
        ================================= */}

        <div
          style={{
            minWidth: 0,

            paddingRight: "8px",
          }}
        >
          <div
            style={{
              fontSize: "7.5px",

              fontWeight: "900",

              color: "#174b91",

              marginBottom: "4px",

              textAlign: "left",
            }}
          >
            MOYENS DE PAIEMENT ACCEPTÉS
          </div>


          <div
            style={{
              fontSize: "6px",

              lineHeight: "1.22",

              color: "#333333",

              whiteSpace: "pre-line",

              overflowWrap: "break-word",
            }}
          >
            {paymentMethods}
          </div>
        </div>


        {/* =================================
            BLOC DROIT
            TERMES ET CONDITIONS
        ================================= */}

        <div
          style={{
            minWidth: 0,

            paddingLeft: "18px",

            borderLeft:
              "1px solid #d7dce4",
          }}
        >
          <div
            style={{
              fontSize: "7.5px",

              fontWeight: "900",

              color: "#174b91",

              marginBottom: "4px",

              textAlign: "left",
            }}
          >
            TERMES ET CONDITIONS DE PAIEMENT
          </div>


          <div
            style={{
              fontSize: "6px",

              lineHeight: "1.22",

              color: "#333333",

              whiteSpace: "pre-line",

              overflowWrap: "break-word",
            }}
          >
            {paymentTerms}
          </div>
             </div>
        </div>

      </div>

    </>
  );


  /* =========================================
     AFFICHAGE DU DOCUMENT
  ========================================= */

  return (
    <div
      ref={documentRef}

      id="umi-quote-document"

      style={{
        width: `${PAGE_WIDTH}px`,

        boxSizing: "border-box",

        fontFamily:
          "Arial, Helvetica, sans-serif",

        backgroundColor: "transparent",
      }}
    >
      {pages.map(
        (page, pageIndex) => {

          const pageNumber =
            pageIndex + 1;


          return (
            <div
              key={`quote-page-${pageNumber}`}

              className="umi-quote-page"

              data-page-number={pageNumber}

              style={{
                width:
                  `${PAGE_WIDTH}px`,

                height:
                  `${PAGE_HEIGHT}px`,

                minHeight:
                  `${PAGE_HEIGHT}px`,

                maxHeight:
                  `${PAGE_HEIGHT}px`,

                boxSizing:
                  "border-box",

                backgroundColor:
                  "#ffffff",

                color:
                  "#171717",

                position:
                  "relative",

                overflow:
                  "hidden",

                display:
                  "flex",

                flexDirection:
                  "column",

                padding:
                  "36px 46px 30px 46px",

                /*
                 * Petit espace seulement
                 * ENTRE les feuilles.
                 *
                 * Aucun espace après
                 * la dernière feuille.
                 */

                margin:
                  pageIndex <
                  pages.length - 1
                    ? "0 auto 25px auto"
                    : "0 auto",

                flexShrink: 0,

                pageBreakAfter:
                  pageIndex <
                  pages.length - 1
                    ? "always"
                    : "auto",

                breakAfter:
                  pageIndex <
                  pages.length - 1
                    ? "page"
                    : "auto",
              }}
            >
              {/* =================================
                  EN-TÊTE
              ================================= */}

              {page.firstPage
                ? renderMainHeader()
                : renderContinuationHeader(
                    pageNumber
                  )}


              {/* =================================
                  TABLEAU
              ================================= */}

              {renderTable(
                page.items,
                page.firstPage
              )}


              {/* =================================
                  DERNIÈRE PAGE

                  Le wrapper possède flex: 1.

                  Cela donne à la zone finale
                  tout l'espace restant de la
                  feuille.

                  À l'intérieur,
                  renderFinalSection contient
                  lui-même un espace flexible
                  avant le pied.
              ================================= */}

              {page.lastPage && (
                <div
                  style={{
                    flex: "1 1 auto",

                    minHeight: 0,

                    display: "flex",

                    flexDirection:
                      "column",

                    width: "100%",
                  }}
                >
                  {renderFinalSection()}
                </div>
              )}


              {/* =================================
                  PAGE NON FINALE

                  On absorbe simplement
                  l'espace restant.
              ================================= */}

              {!page.lastPage && (
                <div
                  style={{
                    flex: "1 1 auto",
                    minHeight: 0,
                  }}
                />
              )}


              {/* =================================
                  NUMÉRO DE PAGE
              ================================= */}

              {pages.length > 1 && (
                <div
                  style={{
                    position: "absolute",

                    right: "46px",

                    bottom: "8px",

                    fontSize: "6px",

                    color: "#9ca3af",
                  }}
                >
                  Page {pageNumber} /{" "}
                  {pages.length}
                </div>
              )}
            </div>
          );
        }
      )}
      {/* PAGES PHOTOS APRÈS LE DEVIS */}

{annexPages.map((annex, annexIndex) => (
  <div
    key={`annex-${annex.id}`}
    className="umi-quote-page"
    data-page-number={pages.length + annexIndex + 1}
    style={{
      width: `${PAGE_WIDTH}px`,
      height: `${PAGE_HEIGHT}px`,
      minHeight: `${PAGE_HEIGHT}px`,
      maxHeight: `${PAGE_HEIGHT}px`,
      boxSizing: "border-box",
      padding: "36px 46px 30px",
      backgroundColor: "#ffffff",
      color: "#171717",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      margin:
        annexIndex < annexPages.length - 1
          ? "25px auto 25px"
          : "25px auto 0",
      breakBefore: "page",
      pageBreakBefore: "always",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        paddingBottom: "16px",
        borderBottom: "2px solid #174b91",
        flexShrink: 0,
      }}
    >
      <img
        src={logoUmi}
        alt="UMI"
        style={{
          width: "80px",
          height: "auto",
          objectFit: "contain",
        }}
      />

      <div style={{ textAlign: "right" }}>
        <h2
          style={{
            margin: "0 0 6px",
            color: "#174b91",
            fontSize: "22px",
            fontWeight: "900",
          }}
        >
          ANNEXE {annexIndex + 1}
        </h2>

        <div style={{ fontSize: "11px" }}>
          Devis : {finalQuote.quoteNumber || ""}
        </div>
      </div>
    </div>

    <p
      style={{
        margin: "16px 0",
        fontSize: "12px",
        color: "#526176",
        flexShrink: 0,
      }}
    >
      Photos jointes au devis
    </p>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gridTemplateRows: "repeat(3, minmax(0, 1fr))",
        gap: "16px",
        flex: "1 1 auto",
        minHeight: 0,
      }}
    >
      {annex.photos.map((photo, photoIndex) => (
        <div
          key={`${annex.id}-${photoIndex}`}
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            border: "1px solid #dce4ee",
            borderRadius: "8px",
            padding: "10px",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: "1 1 auto",
              minHeight: 0,
            }}
          >
            <img
              src={photo.url}
              alt={photo.name || `Photo ${photoIndex + 1}`}
              style={{
                position: "absolute",
                inset: 0,
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              fontWeight: "700",
              textAlign: "center",
              overflowWrap: "anywhere",
              lineHeight: "1.4",
              maxHeight: "46px",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {photo.name || `Photo ${photoIndex + 1}`}
          </div>
        </div>
      ))}
    </div>

    <div
      style={{
        marginTop: "14px",
        textAlign: "right",
        fontSize: "10px",
        color: "#7b8798",
        flexShrink: 0,
      }}
    >
      ANNEXE {annexIndex + 1} / {annexPages.length}
    </div>
  </div>
))}
    </div>
  );
}


export default QuoteDocument;