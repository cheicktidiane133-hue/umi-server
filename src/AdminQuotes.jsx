import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import QuoteDocument from "./QuoteDocument";

import "./CommerceModule.css";


/* ==============================
   ARGENT
============================== */

const money = (value) =>
  `${new Intl.NumberFormat(
    "fr-FR"
  ).format(Number(value) || 0)} FCFA`;


/* ==============================
   DATE
============================== */

const dateFR = (value) => {

  if (!value) {
    return "";
  }

  try {

    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleDateString(
      "fr-FR"
    );

  } catch {

    return "";
  }
};


/* ==============================
   NOM CLIENT
============================== */

const clientName = (quote) =>
  quote?.clientName ||
  quote?.userName ||
  quote?.name ||
  quote?.nom ||
  "Client UMI";


/* ==============================
   CONVERSION NOMBRE
============================== */

const toNumber = (value) => {

  return (
    Number(
      String(value ?? "")
        .replace(/\s/g, "")
        .replace(",", ".")
        .replace(
          /[^0-9.-]/g,
          ""
        )
    ) || 0
  );
};


/* ==============================
   STYLES CHAMPS
============================== */

const fieldStyle = {

  width: "100%",

  boxSizing: "border-box",

  padding: "13px",

  border:
    "1px solid #d7e1e8",

  borderRadius: "10px",

  background: "#ffffff",

  color: "#173e59",

  fontSize: "14px",

  outline: "none",
};


const labelStyle = {

  display: "block",

  marginTop: "16px",

  marginBottom: "7px",

  color: "#173e59",

  fontSize: "13px",

  fontWeight: 700,
};


const cardStyle = {

  background: "#ffffff",

  borderRadius: "16px",

  padding: "18px",

  marginBottom: "16px",

  boxShadow:
    "0 3px 14px rgba(18,63,95,.08)",
};


/* ==============================
   BARRE ADMIN
============================== */

function AdminBottomNav({
  onOpenAdminHome,
  onOpenMachines,
  onOpenAdminLive,
  onOpenQuotes,
  onOpenAdminChat,
}) {

  return (

    <nav className="admin-bottom-nav no-print">

      <button
        type="button"
        className="admin-bottom-nav-item"
        onClick={onOpenAdminHome}
      >
        <span className="admin-bottom-nav-icon">
          🏠
        </span>

        <span>
          Accueil
        </span>
      </button>


      <button
        type="button"
        className="admin-bottom-nav-item"
        onClick={onOpenMachines}
      >
        <span className="admin-bottom-nav-icon">
          ⚙️
        </span>

        <span>
          Catalogue
        </span>
      </button>


      <button
        type="button"
        className="admin-bottom-nav-item"
        onClick={onOpenAdminLive}
      >
        <span className="admin-bottom-nav-icon admin-live-nav-icon">
          ▶
        </span>

        <span>
          UMI LIVE
        </span>
      </button>


      <button
        type="button"
        className="admin-bottom-nav-item active"
        onClick={onOpenQuotes}
      >
        <span className="admin-bottom-nav-icon">
          📄
        </span>

        <span>
          Devis
        </span>
      </button>


      <button
        type="button"
        className="admin-bottom-nav-item"
        onClick={onOpenAdminChat}
      >
        <span className="admin-bottom-nav-icon">
          💬
        </span>

        <span>
          Messages
        </span>
      </button>

    </nav>
  );
}


/* ==============================
   ADMIN QUOTES
============================== */

function AdminQuotes({
  embedded = false,
  onBack,
  onOpenAdminHome,
  onOpenMachines,
  onOpenAdminLive,
  onOpenQuotes,
  onOpenAdminChat,
}) {


  /* ============================
     ÉTATS
  ============================ */

  const [
    quotes,
    setQuotes,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    selectedQuote,
    setSelectedQuote,
  ] = useState(null);


  const [
    sendingQuote,
    setSendingQuote,
  ] = useState(false);


  const [
    showQuoteSheet,
    setShowQuoteSheet,
  ] = useState(false);


  const [
    quoteScale,
    setQuoteScale,
  ] = useState(1);


  const [
    quotePageCount,
    setQuotePageCount,
  ] = useState(1);


  /* ============================
     LIGNES AJOUTÉES PAR ADMIN
  ============================ */

  const [
    extraLines,
    setExtraLines,
  ] = useState([]);

/* ============================
   PAGES PHOTOS DU DEVIS
============================ */

const [
  photoPages,
  setPhotoPages,
] = useState([]);
  /* ============================
     REFS
  ============================ */

  const quoteWrapperRef =
    useRef(null);

  const quoteDocumentRef =
    useRef(null);


  /* ============================
     FORMULAIRE
  ============================ */

  const [
    quoteForm,
    setQuoteForm,
  ] = useState({

    quoteNumber: "",

    description: "",

    quantity: "",

    unitPrice: "",

    deliveryCost: "",

    deliveryTime: "",

    validity: "",

    paymentMethods: "",

    paymentTerms: "",

    notes: "",
  });


  /* ============================
     CHARGEMENT FIREBASE
  ============================ */

  useEffect(() => {

    const quotesQuery =
      query(
        collection(
          db,
          "quotes"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );


    const unsubscribe = onSnapshot(
  quotesQuery,

  (snapshot) => {
    const loadedQuotes = snapshot.docs
      .map((item) => ({
        ...item.data(),
        id: item.id,
      }))
      .filter(
        (quote) => quote.adminDeleted !== true
      );

    setQuotes(loadedQuotes);

    setSelectedQuote((current) => {
      if (!current) return null;

      return (
        loadedQuotes.find(
          (quote) => quote.id === current.id
        ) || null
      );
    });

    setLoading(false);
  },

  (error) => {
    console.error(
      "Erreur chargement devis :",
      error
    );

    setLoading(false);
  }
);
    return () => {
      unsubscribe();
    };

  }, []);


  /* ============================
     RESPONSIVE APERÇU
  ============================ */

  useEffect(() => {

    if (!showQuoteSheet) {
      return;
    }


    const updateQuotePreview =
      () => {

        if (
          !quoteWrapperRef.current
        ) {
          return;
        }


        const availableWidth =
          quoteWrapperRef
            .current
            .clientWidth;


        if (!availableWidth) {
          return;
        }


        const documentWidth = 794;


        const newScale =
          Math.min(
            1,
            availableWidth /
              documentWidth
          );


        setQuoteScale(
          newScale
        );


        window.requestAnimationFrame(
          () => {

            const documentElement =
              quoteDocumentRef.current;


            if (!documentElement) {

              setQuotePageCount(1);

              return;
            }


            const realPages =
              documentElement
                .querySelectorAll(
                  ".umi-quote-page"
                )
                .length;


            setQuotePageCount(
              Math.max(
                1,
                realPages
              )
            );
          }
        );
      };


    const timer =
      window.setTimeout(
        updateQuotePreview,
        100
      );


    window.addEventListener(
      "resize",
      updateQuotePreview
    );


    return () => {

      window.clearTimeout(
        timer
      );

      window.removeEventListener(
        "resize",
        updateQuotePreview
      );
    };

  }, [
    showQuoteSheet,
    selectedQuote,
    quoteForm,
    extraLines,
  ]);


  /* ============================
     OUVRIR UNE DEMANDE
  ============================ */
const [quoteToDelete, setQuoteToDelete] = useState(null);
const [deletingQuote, setDeletingQuote] = useState(false);
const [deleteError, setDeleteError] = useState("");

const deleteQuote = (quote) => {
  setDeleteError("");
  setQuoteToDelete(quote);
};

const confirmDeleteQuote = async () => {
  if (!quoteToDelete?.id || deletingQuote) return;

  setDeletingQuote(true);
  setDeleteError("");

  try {
    await updateDoc(
      doc(db, "quotes", quoteToDelete.id),
      {
        adminDeleted: true,
      }
    );

    setQuotes((current) =>
      current.filter(
        (item) => item.id !== quoteToDelete.id
      )
    );

    setQuoteToDelete(null);
  } catch (error) {
    console.error("Erreur retrait devis admin :", error);

    setDeleteError(
      "Impossible de retirer le devis. " +
      (error?.message || "")
    );
  } finally {
    setDeletingQuote(false);
  }
};
    const openQuote = (quote) => {
    if (quote.adminSeen !== true) {
      updateDoc(doc(db, "quotes", quote.id), {
        adminSeen: true,
      }).catch((error) => {
        console.error(
          "Erreur lecture devis admin :",
          error
        );
      });
    }

    setSelectedQuote(quote);

    setShowQuoteSheet(false);

    /* RECHARGER LES ANNEXES ENREGISTRÉES */

    const savedPhotoPages = Array.isArray(
      quote?.finalQuote?.photoPages
    )
      ? quote.finalQuote.photoPages
      : [];

    setPhotoPages(
      savedPhotoPages.map((page, pageIndex) => {
        const savedPhotos = Array.isArray(page?.photos)
          ? page.photos
              .filter((photo) => photo?.url)
              .map((photo) => ({
                ...photo,
                url: photo.url,
                name: photo.name || "",
                file: null,
              }))
          : [];

        return {
          ...page,
          id: page.id || `saved-photo-page-${pageIndex}`,
          photos: [
            ...savedPhotos,
            ...Array.from(
              {
                length: Math.max(
                  0,
                  6 - savedPhotos.length
                ),
              },
              () => ({
                url: "",
                name: "",
                file: null,
              })
            ),
          ],
        };
      })
    );


    const savedItems =
      Array.isArray(
        quote?.finalQuote?.items
      )
        ? quote.finalQuote.items
        : [];


    const savedExtraLines =
      savedItems.length > 1
        ? savedItems
            .slice(1)
            .map(
              (item, index) => ({

                id:
                  item.id ||
                  `${Date.now()}-${index}`,

                description:
                  item.name ||
                  item.description ||
                  "",

                quantity:
                  String(
                    item.quantity ?? 1
                  ),

                unitPrice:
                  String(
                    item.unitPrice ?? 0
                  ),
              })
            )
        : [];


    setExtraLines(
      savedExtraLines
    );


    const firstSavedItem =
      savedItems[0];


    setQuoteForm({

      quoteNumber:
        quote
          ?.finalQuote
          ?.quoteNumber ||
        `UMI-${Date.now()
          .toString()
          .slice(-8)}`,


      description:
        firstSavedItem?.name ||
        firstSavedItem?.description ||
        quote
          ?.finalQuote
          ?.description ||
        quote?.productName ||
        quote?.product?.name ||
        quote?.subject ||
        "",


      quantity:
        String(
          firstSavedItem
            ?.quantity ??
          quote
            ?.finalQuote
            ?.quantity ??
          quote?.quantity ??
          1
        ),


      unitPrice:
        String(
          firstSavedItem
            ?.unitPrice ??
          quote
            ?.finalQuote
            ?.unitPrice ??
          ""
        ),


      deliveryCost:
        String(
          quote
            ?.finalQuote
            ?.deliveryCost ??
          quote
            ?.finalQuote
            ?.shipping ??
          ""
        ),


      deliveryTime:
        quote
          ?.finalQuote
          ?.deliveryTime ||
        "",


      validity:
        quote
          ?.finalQuote
          ?.validity ||
        "15 jours",


      paymentMethods:
        quote
          ?.finalQuote
          ?.paymentMethods ||
`Les paiements peuvent s'effectuer selon votre convenance :
Paiement physique directement au bureau.
Virement ou versement bancaire.
Autres moyens de paiement autorisés par l'entreprise.`,


      paymentTerms:
        quote
          ?.finalQuote
          ?.paymentTerms ||
`Option A — Matériel déjà disponible (en stock) :
Paiement intégral : 100% à la commande livraison.
Livraison immédiate

Option B — Matériel sur commande :
50% d'acompte à la signature du devis pour validation.
40% d'avance au chargement (au départ / avant l'expédition).
10% de solde à la livraison.
Délai d’expédition : 6 semaines

`,


      notes:
        quote
          ?.finalQuote
          ?.notes ||
        "",
    });


    if (embedded) {
      document.querySelector(".umi-quotes-window")?.closest(".umi-modal-content")?.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };


  /* ============================
     FERMER DEVIS
  ============================ */

  const closeQuote = () => {

    setSelectedQuote(
      null
    );

    setShowQuoteSheet(
      false
    );

    setExtraLines([]);

    setQuotePageCount(1);


    if (embedded) {
      document.querySelector(".umi-quotes-window")?.closest(".umi-modal-content")?.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };


  /* ============================
     MODIFIER FORMULAIRE
  ============================ */

  const updateField = (
    event
  ) => {

    const {
      name,
      value,
    } = event.target;


    setQuoteForm(
      (old) => ({
        ...old,
        [name]: value,
      })
    );
  };


  /* ============================
     AJOUTER UNE LIGNE

     CORRECTION :
     la nouvelle ligne est maintenant
     ajoutée APRÈS les lignes existantes.
  ============================ */

  const addExtraLine = () => {
  setExtraLines((oldLines) => [
    ...oldLines,
    {
      id: `${Date.now()}-${Math.random()}`,
      description: "",
      quantity: "1",
      unitPrice: "",
    },
  ]);
};


/* ============================
   AJOUTER UNE PAGE PHOTOS
============================ */

const addPhotoPage = () => {
  setPhotoPages((oldPages) => [
    ...oldPages,
    {
      id: `${Date.now()}-${Math.random()}`,
      photos: [
  { url: null, name: "" },
  { url: null, name: "" },
  { url: null, name: "" },
  { url: null, name: "" },
  { url: null, name: "" },
  { url: null, name: "" },
],
    },
  ]);
};
  /* ============================
     MODIFIER UNE LIGNE
  ============================ */

  const updateExtraLine = (
    id,
    field,
    value
  ) => {

    setExtraLines(
      (oldLines) =>
        oldLines.map(
          (line) =>
            line.id === id
              ? {
                  ...line,
                  [field]: value,
                }
              : line
        )
    );
  };


  /* ============================
     SUPPRIMER UNE LIGNE
  ============================ */

  const removeExtraLine = (
    id
  ) => {

    setExtraLines(
      (oldLines) =>
        oldLines.filter(
          (line) =>
            line.id !== id
        )
    );
  };


  /* ============================
     CALCUL LIGNE PRINCIPALE
  ============================ */

  const mainQuantity =
    toNumber(
      quoteForm.quantity
    );


  const mainUnitPrice =
    toNumber(
      quoteForm.unitPrice
    );


  const mainTotal =
    mainQuantity *
    mainUnitPrice;


  /* ============================
     LIVRAISON
  ============================ */

  const deliveryCost =
    toNumber(
      quoteForm.deliveryCost
    );


  /* ============================
     CALCUL LIGNES AJOUTÉES
  ============================ */

  const calculatedExtraLines =
    extraLines.map(
      (line) => {

        const quantity =
          toNumber(
            line.quantity
          );


        const unitPrice =
          toNumber(
            line.unitPrice
          );


        return {
          ...line,

          quantity,

          unitPrice,

          total:
            quantity *
            unitPrice,
        };
      }
    );


  /* ============================
     TOTAL LIGNES AJOUTÉES
  ============================ */

  const extraLinesTotal =
    calculatedExtraLines.reduce(
      (sum, line) =>
        sum + line.total,
      0
    );


  /* ============================
     SOUS-TOTAL
  ============================ */

  const productsTotal =
    mainTotal +
    extraLinesTotal;


  /* ============================
     TOTAL GÉNÉRAL
  ============================ */

  const total =
    productsTotal +
    deliveryCost;


  /* ============================
     ITEMS DU DEVIS
  ============================ */

  const quoteItems = [

    /* =========================
       LIGNE PRINCIPALE
    ========================= */

    {
      id: "main",

      name:
        quoteForm.description ||
        "Machine / équipement",

      quantity:
        mainQuantity,

      unitPrice:
        mainUnitPrice,

      total:
        mainTotal,
    },


    /* =========================
       LIGNES AJOUTÉES

       Elles viennent directement
       après la ligne principale.
    ========================= */

    ...calculatedExtraLines
      .filter(
        (line) =>
          (line.description || "")
            .trim() !== ""
      )
      .map(
        (line) => ({
          id: line.id,

          name:
            (line.description || "")
              .trim(),

          quantity:
            line.quantity,

          unitPrice:
            line.unitPrice,

          total:
            line.total,
        })
      ),
  ];
    /* ============================
     APERÇU TEMPORAIRE
  ============================ */

  const previewQuote = {

    ...selectedQuote,

    finalQuote: {

      ...(selectedQuote
        ?.finalQuote ||
        {}),

      quoteNumber:
        quoteForm.quoteNumber,

      description:
        quoteForm.description,

      quantity:
        mainQuantity,

      unitPrice:
        mainUnitPrice,

      items:
        quoteItems,

      productsTotal,

      subtotal:
        productsTotal,

      deliveryCost,

      shipping:
        deliveryCost,

      total,

      currency:
        "FCFA",

      deliveryTime:
        quoteForm.deliveryTime,

      validity:
        quoteForm.validity,

      paymentMethods:
        quoteForm.paymentMethods || "",

      paymentTerms:
        quoteForm.paymentTerms || "",

      notes:
        quoteForm.notes || "",
    },
  };


  /* ============================
     ENVOYER LE DEVIS
  ============================ */

  const sendQuote = async () => {
  if (!selectedQuote?.id || sendingQuote) return;

  if (!(quoteForm.quoteNumber || "").trim()) {
    await umiNotify("Veuillez renseigner le numéro du devis.");
    return;
  }

  if (!(quoteForm.description || "").trim()) {
    await umiNotify("Veuillez renseigner la désignation principale.");
    return;
  }

  if (
    !Number.isFinite(mainQuantity) ||
    mainQuantity <= 0
  ) {
    await umiNotify("Veuillez renseigner une quantité valide.");
    return;
  }

  if (
    !Number.isFinite(mainUnitPrice) ||
    mainUnitPrice <= 0
  ) {
    await umiNotify("Veuillez renseigner un prix unitaire valide.");
    return;
  }

  for (const line of calculatedExtraLines) {
    const hasSomething =
      (line.description || "").trim() !== "" ||
      line.unitPrice > 0;

    if (
      hasSomething &&
      !(line.description || "").trim()
    ) {
      await umiNotify(
        "Veuillez renseigner la désignation de chaque ligne ajoutée."
      );
      return;
    }

    if (
      hasSomething &&
      (
        !Number.isFinite(line.quantity) ||
        line.quantity <= 0
      )
    ) {
      await umiNotify(
        "La quantité d'une ligne ajoutée doit être supérieure à 0."
      );
      return;
    }
  }

  const quoteId = selectedQuote.id;

  setSendingQuote(true);

  try {
    const cloudName =
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    /* ENVOYER UNE PHOTO */

    const uploadPhoto = async (file) => {
      if (!cloudName || !uploadPreset) {
        throw new Error(
          "La configuration Cloudinary est manquante."
        );
      }

      if (!file.type.startsWith("image/")) {
        throw new Error("Le fichier choisi doit être une image.");
      }

      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const controller = new AbortController();

      const timer = setTimeout(
        () => controller.abort(),
        90000
      );

      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok || !data.secure_url) {
          throw new Error(
            data?.error?.message ||
              "Impossible d'envoyer la photo."
          );
        }

        return data.secure_url;
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error(
            "L'envoi d'une photo a dépassé 90 secondes. Vérifiez la connexion et réessayez."
          );
        }

        throw error;
      } finally {
        clearTimeout(timer);
      }
    };

    /* PRÉPARER LES ANNEXES */

    const uploadedPhotoPages = [];

    for (
      let pageIndex = 0;
      pageIndex < photoPages.length;
      pageIndex++
    ) {
      const page = photoPages[pageIndex];

      const photos = Array.isArray(page.photos)
        ? page.photos
        : [];

      const savedPhotos = [];

      for (
        let photoIndex = 0;
        photoIndex < photos.length;
        photoIndex++
      ) {
        const photo = photos[photoIndex];

        if (!photo?.file && !photo?.url) continue;

        let url = photo.url || "";

        if (photo.file) {
          url = await uploadPhoto(photo.file);

          // Conserver l'URL permanente immédiatement.
          // Une nouvelle tentative ne renverra pas ce fichier.
          setPhotoPages((current) =>
            current.map((currentPage, currentPageIndex) => {
              if (currentPageIndex !== pageIndex) {
                return currentPage;
              }

              return {
                ...currentPage,
                photos: currentPage.photos.map(
                  (currentPhoto, currentPhotoIndex) =>
                    currentPhotoIndex === photoIndex
                      ? {
                          ...currentPhoto,
                          url,
                          file: null,
                        }
                      : currentPhoto
                ),
              };
            })
          );
        }

        if (!/^https?:\/\//i.test(url)) {
          throw new Error(
            `La photo ${photoIndex + 1} de l'annexe ${
              pageIndex + 1
            } est seulement un aperçu local. Sélectionnez-la à nouveau avant d'envoyer.`
          );
        }

        savedPhotos.push({
          url,
          name: (photo.name || "").trim(),
        });
      }

      if (savedPhotos.length > 0) {
        uploadedPhotoPages.push({
          id: page.id || `annex-${pageIndex + 1}`,
          photos: savedPhotos,
        });
      }
    }

    /* DEVIS AVEC URL PERMANENTES */

    const finalQuote = {
      quoteNumber:
        (quoteForm.quoteNumber || "").trim(),

      description:
        (quoteForm.description || "").trim(),

      quantity: mainQuantity,
      unitPrice: mainUnitPrice,
      items: quoteItems,

      productsTotal,
      subtotal: productsTotal,

      deliveryCost,
      shipping: deliveryCost,

      total,
      currency: "FCFA",

      deliveryTime:
        (quoteForm.deliveryTime || "").trim(),

      validity:
        (quoteForm.validity || "").trim(),

      paymentMethods:
        (quoteForm.paymentMethods || "").trim(),

      paymentTerms:
        (quoteForm.paymentTerms || "").trim(),

      notes:
        (quoteForm.notes || "").trim(),

      photoPages: uploadedPhotoPages,
    };

        /* ENREGISTRER POUR LE CLIENT */

    await updateDoc(
      doc(db, "quotes", quoteId),
      {
        finalQuote,
        status: "Devis envoyé",
        respondedAt: serverTimestamp(),
        clientDeleted: false,
        clientSeen: false,
        adminSeen: true,
      }
    );

    setPhotoPages(
      uploadedPhotoPages.map((page) => ({
        ...page,
        photos: [
          ...page.photos.map((photo) => ({
            ...photo,
            file: null,
          })),
          ...Array.from(
            { length: Math.max(0, 6 - page.photos.length) },
            () => ({
              url: "",
              name: "",
              file: null,
            })
          ),
        ],
      }))
    );

    setSelectedQuote((old) =>
      old?.id === quoteId
        ? {
            ...old,
            finalQuote,
            status: "Devis envoyé",
          }
        : old
    );

    setShowQuoteSheet(true);

    await umiNotify("Le devis et ses annexes ont été envoyés au client.");
  } catch (error) {
    console.error("Erreur envoi devis :", error);

    await umiNotify(
      "Impossible d'envoyer le devis.\n\n" +
        (error?.message || "Erreur inconnue.")
    );
  } finally {
    setSendingQuote(false);
  }
};
  /* ============================
     IMPRIMER
  ============================ */

  const printQuote = () => {
    window.print();
  };


  /* =========================================
     APERÇU DU DEVIS
  ========================================= */

  if (
    selectedQuote &&
    showQuoteSheet
  ) {

    const PAGE_HEIGHT = 1123;

    const PAGE_GAP = 25;


    /*
     * Hauteur originale de toutes
     * les feuilles du devis.
     */

    const quoteOriginalHeight =
      PAGE_HEIGHT *
        quotePageCount +
      PAGE_GAP *
        Math.max(
          0,
          quotePageCount - 1
        );


    /*
     * Hauteur réellement visible
     * après le scale.
     *
     * Cela permet aux boutons de
     * commencer juste après la
     * dernière page du devis.
     */

    const quoteVisibleHeight =
      quoteOriginalHeight *
      quoteScale;


    return (

      <div className="admin-quotes-page">


        {/* =========================
            EN-TÊTE
        ========================= */}

        <div className="admin-quotes-header no-print">

          <button
            type="button"
            className="admin-quotes-back"
            onClick={() =>
              setShowQuoteSheet(
                false
              )
            }
          >
            ←
          </button>


          <div className="admin-quotes-header-text">

            <h1>
              Aperçu du devis
            </h1>

            <p>
              {clientName(
                selectedQuote
              )}
            </p>

          </div>

        </div>


        {/* =========================
            APERÇU
        ========================= */}

        <div className="admin-quote-preview-page">

          <div
            ref={quoteWrapperRef}
            className="admin-quote-wrapper"

            style={{
              width: "100%",

              height:
                `${quoteVisibleHeight}px`,

              minHeight:
                `${quoteVisibleHeight}px`,

              overflow: "hidden",

              position: "relative",
            }}
          >

            <div
              style={{
                width:
                  `${794 * quoteScale}px`,

                height:
                  `${quoteVisibleHeight}px`,

                margin:
                  "0 auto",

                overflow:
                  "visible",
              }}
            >

              <div
                className="admin-quote-scale"

                style={{
                  width: "794px",

                  transform:
                    `scale(${quoteScale})`,

                  transformOrigin:
                    "top left",
                }}
              >

                <QuoteDocument
                  quote={
                    previewQuote
                  }

                  user={{
                    prenom:
                      selectedQuote?.clientName ||
                      selectedQuote?.userName ||
                      selectedQuote?.name ||
                      selectedQuote?.nom ||
                      "Client UMI",

                    nom: "",

                    email:
                      selectedQuote?.clientEmail ||
                      selectedQuote?.email ||
                      "",

                    phone:
                      selectedQuote?.clientPhone ||
                      selectedQuote?.phone ||
                      selectedQuote?.telephone ||
                      "",

                    address:
                      selectedQuote?.clientAddress ||
                      selectedQuote?.address ||
                      selectedQuote?.location ||
                      "",
                  }}

                  documentRef={
                    quoteDocumentRef
                  }
                />

              </div>

            </div>

          </div>


          {/* =================================
              BOUTONS APRÈS LA DERNIÈRE PAGE
          ================================= */}

          <div
            className="admin-quote-preview-actions no-print"

            style={{
              marginTop: "18px",
            }}
          >

            <button
              type="button"
              className="admin-edit-quote-button"

              onClick={() =>
                setShowQuoteSheet(
                  false
                )
              }
            >
              ✎ Modifier
            </button>


            <button
              type="button"
              className="admin-print-quote-button"

              onClick={
                printQuote
              }
            >
              🖨 Imprimer
            </button>


            <button
              type="button"
              className="admin-close-quote-button"

              onClick={
                closeQuote
              }
            >
              Fermer
            </button>

          </div>

        </div>


        {/* =================================
            BARRE DES TÂCHES ADMIN
        ================================= */}

        <AdminBottomNav
          onOpenAdminHome={
            onOpenAdminHome
          }

          onOpenMachines={
            onOpenMachines
          }

          onOpenAdminLive={
            onOpenAdminLive
          }

          onOpenQuotes={
            onOpenQuotes
          }

          onOpenAdminChat={
            onOpenAdminChat
          }
        />


        <AdminQuoteStyles />

      </div>
    );
  }


  /* =========================================
     PRÉPARER LE DEVIS
  ========================================= */

  if (selectedQuote) {

    return (
      <div className="admin-quotes-page">

        {/* =========================
            EN-TÊTE
        ========================= */}

        <div className="admin-quotes-header">

          <button
            type="button"
            className="admin-quotes-back"
            onClick={closeQuote}
          >
            ←
          </button>

          <div className="admin-quotes-header-text">
            <h1>Préparer le devis</h1>

            <p>
              {clientName(selectedQuote)}
            </p>
          </div>

        </div>


        {/* =========================
            CONTENU FORMULAIRE
        ========================= */}

        <div className="admin-quote-form-page">

          {/* =================================
              INFORMATIONS CLIENT
          ================================= */}

          <div style={cardStyle}>

            <div className="admin-section-title">
              Informations du client
            </div>

            <div className="admin-client-name">
              {clientName(selectedQuote)}
            </div>


            {(selectedQuote?.phone ||
              selectedQuote?.telephone) && (

              <div className="admin-client-info">

                <strong>
                  Téléphone / WhatsApp :
                </strong>{" "}

                {selectedQuote.phone ||
                  selectedQuote.telephone}

              </div>
            )}


            {selectedQuote?.email && (

              <div className="admin-client-info">

                <strong>
                  Adresse e-mail :
                </strong>{" "}

                {selectedQuote.email}

              </div>
            )}


            {selectedQuote?.companyName && (

              <div className="admin-client-info">

                <strong>
                  Nom de la société :
                </strong>{" "}

                {selectedQuote.companyName}

              </div>
            )}


            <div
              style={{
                height: "1px",
                background: "#e7ebf0",
                margin: "18px 0",
              }}
            />


            <div className="admin-section-title">
              Informations de la demande
            </div>


            {(selectedQuote?.productName ||
              selectedQuote?.product?.name) && (

              <div className="admin-request-product">

                <span>
                  Produit demandé
                </span>

                <strong>
                  {selectedQuote?.productName ||
                    selectedQuote?.product?.name}
                </strong>

              </div>
            )}


            {selectedQuote?.subject && (

              <div
                className="admin-client-info"
                style={{
                  marginTop: "12px",
                }}
              >
                <strong>
                  Objet de la demande :
                </strong>{" "}

                {selectedQuote.subject}
              </div>
            )}


            {selectedQuote?.quantity && (

              <div
                className="admin-client-info"
                style={{
                  marginTop: "8px",
                }}
              >
                <strong>
                  Quantité souhaitée :
                </strong>{" "}

                {selectedQuote.quantity}
              </div>
            )}


            {selectedQuote?.country && (

              <div
                className="admin-client-info"
                style={{
                  marginTop: "8px",
                }}
              >
                <strong>
                  Pays de livraison :
                </strong>{" "}

                {selectedQuote.country}
              </div>
            )}


            {selectedQuote?.budget && (

              <div
                className="admin-client-info"
                style={{
                  marginTop: "8px",
                }}
              >
                <strong>
                  Budget approximatif :
                </strong>{" "}

                {selectedQuote.budget}
              </div>
            )}


            {selectedQuote?.message && (

              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  background: "#f6f9fc",
                  border: "1px solid #e1e8ef",
                  borderRadius: "10px",
                }}
              >

                <div
                  style={{
                    color: "#174b91",
                    fontSize: "12px",
                    fontWeight: "800",
                    marginBottom: "7px",
                  }}
                >
                  Besoin du client
                </div>

                <div
                  style={{
                    color: "#374151",
                    fontSize: "13px",
                    lineHeight: "1.55",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                  }}
                >
                  {selectedQuote.message}
                </div>

              </div>
            )}


            {selectedQuote?.createdAt && (

              <div
                className="admin-client-info"
                style={{
                  marginTop: "14px",
                  color: "#7b8493",
                }}
              >
                <strong>
                  Demande du :
                </strong>{" "}

                {dateFR(selectedQuote.createdAt)}
              </div>
            )}

          </div>


          {/* =================================
              INFORMATIONS DU DEVIS
          ================================= */}

          <div style={cardStyle}>

            <div className="admin-section-title">
              Informations du devis
            </div>


            <label style={labelStyle}>
              Numéro du devis
            </label>

            <input
              style={fieldStyle}
              type="text"
              name="quoteNumber"
              value={quoteForm.quoteNumber}
              onChange={updateField}
              placeholder="Ex : UMI-0001"
            />


            {/* =========================
                LIGNE PRINCIPALE
            ========================= */}

            <div className="admin-main-line-title">

              <span>
                Ligne principale
              </span>

              <small>
                Demande du client
              </small>

            </div>


            <label style={labelStyle}>
              Désignation / Machine
            </label>

            <textarea
              style={{
                ...fieldStyle,
                minHeight: "85px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              name="description"
              value={quoteForm.description}
              onChange={updateField}
              placeholder="Nom de la machine ou description"
            />


            <div className="admin-form-grid">

              <div>

                <label style={labelStyle}>
                  Quantité
                </label>

                <input
                  style={fieldStyle}
                  type="text"
                  inputMode="decimal"
                  name="quantity"
                  value={quoteForm.quantity}
                  onChange={updateField}
                  placeholder="1"
                />

              </div>


              <div>

                <label style={labelStyle}>
                  Prix unitaire
                </label>

                <input
                  style={fieldStyle}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  name="unitPrice"
                  value={quoteForm.unitPrice}
                  onChange={updateField}
                  placeholder="0"
                />

              </div>

            </div>


            <div className="admin-main-line-total">

              <span>
                Total ligne principale
              </span>

              <strong>
                {money(mainTotal)}
              </strong>

            </div>


            {/* =========================
                LIGNES SUPPLÉMENTAIRES
            ========================= */}

            <div className="admin-extra-lines-section">

              <div className="admin-extra-lines-header">

                <div>

                  <h3>
                    Lignes supplémentaires
                  </h3>

                  <p>
                    Ajoutez une ou plusieurs lignes différentes de la demande remplie par le client.
                  </p>

                </div>


                <button
                  type="button"
                  className="admin-add-line-button"
                  onClick={addExtraLine}
                >
                  + Ajouter une ligne
                </button>
                              </div>
<button
  type="button"
  onClick={addPhotoPage}
  style={{
    width: "100%",
    marginTop: "12px",
    padding: "14px",
    borderRadius: "10px",
    border: "2px solid #174b91",
    background: "#ffffff",
    color: "#174b91",
    fontWeight: "800",
    cursor: "pointer",
  }}
>
  🖼️ Ajouter une page photos
</button>
{photoPages.map((photoPage, pageIndex) => (

  <div
    key={photoPage.id}
    style={{
      marginTop: "20px",
      padding: "16px",
      background: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "12px",
    }}
  >

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "15px",
      }}
    >
      <strong>
        Page photos {pageIndex + 1}
      </strong>

      <button
        type="button"
        onClick={() =>
          setPhotoPages((oldPages) =>
            oldPages.filter(
              (page) => page.id !== photoPage.id
            )
          )
        }
        style={{
          border: "none",
          background: "transparent",
          color: "#dc2626",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        Supprimer la page
      </button>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
      }}
    >

      {photoPage.photos.map((photo, photoIndex) => (

  <div
    key={photoIndex}
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}
  >

    {/* PHOTO */}

    <label
      style={{
        minHeight: "150px",
        border: "2px dashed #cbd5e1",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        cursor: "pointer",
        background: "#f8fafc",
      }}
    >

      {photo?.url ? (

        <img
          src={photo.url}
          alt={
            photo.name ||
            `Photo ${photoIndex + 1}`
          }
          style={{
            width: "100%",
            height: "150px",
            objectFit: "cover",
          }}
        />

      ) : (

        <span>
          + Photo {photoIndex + 1}
        </span>

      )}


      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {

          const file =
            event.target.files?.[0];

          if (!file) return;

          const imageUrl =
            URL.createObjectURL(file);

          setPhotoPages((oldPages) =>
            oldPages.map((page) => {

              if (
                page.id !== photoPage.id
              ) {
                return page;
              }

              const newPhotos =
                [...page.photos];

              newPhotos[photoIndex] = {
  ...(newPhotos[photoIndex] || {}),
  file: file,
  url: imageUrl,
  name: newPhotos[photoIndex]?.name || "",
};

              return {
                ...page,
                photos: newPhotos,
              };
            })
          );
        }}
      />

    </label>


    {/* NOM DE LA PHOTO */}

    <input
      type="text"
      placeholder="Nom de la photo"
      value={photo?.name || ""}
      onChange={(event) => {

        const value =
          event.target.value;

        setPhotoPages((oldPages) =>
          oldPages.map((page) => {

            if (
              page.id !== photoPage.id
            ) {
              return page;
            }

            const newPhotos =
              [...page.photos];

            newPhotos[photoIndex] = {
              ...(
                newPhotos[photoIndex] ||
                {}
              ),
              url:
                newPhotos[photoIndex]
                  ?.url || null,
              name: value,
            };

            return {
              ...page,
              photos: newPhotos,
            };
          })
        );
      }}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 10px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        fontSize: "13px",
        outline: "none",
        background: "#ffffff",
      }}
    />

    </div>

))}

    </div>

  </div>

))}


{extraLines.length === 0 && (

                <div className="admin-no-extra-line">
                  Aucune ligne supplémentaire.
                </div>

              )}


              {[...extraLines].reverse().map((line) => {

  const realIndex =
    extraLines.findIndex(
      (item) => item.id === line.id
    );

                const lineQuantity =
                  toNumber(line.quantity);

                const lineUnitPrice =
                  toNumber(line.unitPrice);

                const lineTotal =
                  lineQuantity *
                  lineUnitPrice;


                return (

                  <div
                    key={line.id}
                    className="admin-extra-line-card"
                  >

                    <div className="admin-extra-line-top">

                      <strong>
  Ligne {realIndex + 2}
</strong>


                      <button
                        type="button"
                        className="admin-remove-line-button"
                        onClick={() =>
                          removeExtraLine(line.id)
                        }
                      >
                        Supprimer
                      </button>

                    </div>


                    <label style={labelStyle}>
                      Désignation
                    </label>

                    <input
                      style={fieldStyle}
                      type="text"
                      value={line.description}
                      onChange={(event) =>
                        updateExtraLine(
                          line.id,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="Ex : Installation, accessoire, pièce supplémentaire..."
                    />


                    <div className="admin-form-grid">

                      <div>

                        <label style={labelStyle}>
                          Quantité
                        </label>

                        <input
                          style={fieldStyle}
                          type="text"
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(event) =>
                            updateExtraLine(
                              line.id,
                              "quantity",
                              event.target.value
                            )
                          }
                          placeholder="1"
                        />

                      </div>


                      <div>

                        <label style={labelStyle}>
                          Prix unitaire
                        </label>

                        <input
                          style={fieldStyle}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={line.unitPrice}
                          onChange={(event) =>
                            updateExtraLine(
                              line.id,
                              "unitPrice",
                              event.target.value
                            )
                          }
                          placeholder="0"
                        />

                      </div>

                    </div>


                    <div className="admin-extra-line-total">

                      <span>
                        Total de la ligne
                      </span>

                      <strong>
                        {money(lineTotal)}
                      </strong>

                    </div>

                  </div>
                );
              })}


              {extraLines.length > 0 && (

                <div className="admin-extra-lines-total">

                  <span>
                    Total lignes supplémentaires
                  </span>

                  <strong>
                    {money(extraLinesTotal)}
                  </strong>

                </div>

              )}

            </div>


            {/* =========================
                LIVRAISON
            ========================= */}

            <label style={labelStyle}>
              Frais de livraison
            </label>

            <input
              style={fieldStyle}
              type="number"
              inputMode="numeric"
              min="0"
              name="deliveryCost"
              value={quoteForm.deliveryCost}
              onChange={updateField}
              placeholder="0"
            />


            {/* =========================
                CALCUL TOTAL
            ========================= */}

            <div className="admin-quote-calculation">

              <div>
                <span>
                  Ligne principale
                </span>

                <strong>
                  {money(mainTotal)}
                </strong>
              </div>


              {extraLines.length > 0 && (

                <div>
                  <span>
                    Lignes supplémentaires
                  </span>

                  <strong>
                    {money(extraLinesTotal)}
                  </strong>
                </div>

              )}


              <div>
                <span>
                  Sous-total
                </span>

                <strong>
                  {money(productsTotal)}
                </strong>
              </div>


              {deliveryCost > 0 && (

                <div>
                  <span>
                    Livraison
                  </span>

                  <strong>
                    {money(deliveryCost)}
                  </strong>
                </div>

              )}


              <div className="admin-quote-total">

                <span>
                  TOTAL
                </span>

                <strong>
                  {money(total)}
                </strong>

              </div>

            </div>


            <label style={labelStyle}>
              Délai de livraison
            </label>

            <input
              style={fieldStyle}
              type="text"
              name="deliveryTime"
              value={quoteForm.deliveryTime}
              onChange={updateField}
              placeholder="Ex : 6 semaines"
            />


            <label style={labelStyle}>
              Validité du devis
            </label>

            <input
              style={fieldStyle}
              type="text"
              name="validity"
              value={quoteForm.validity}
              onChange={updateField}
              placeholder="Ex : 15 jours"
            />


            {/* =========================
                PIED DU DEVIS
            ========================= */}

            <div
              style={{
                marginTop: "22px",
                paddingTop: "18px",
                borderTop: "2px solid #174b91",
              }}
            >

              <div
                className="admin-section-title"
                style={{
                  marginBottom: "14px",
                }}
              >
                Pied de page du devis
              </div>


              <label style={labelStyle}>
                Moyens de paiement acceptés
              </label>

              <textarea
                style={{
                  ...fieldStyle,
                  minHeight: "120px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: "1.5",
                }}
                name="paymentMethods"
                value={quoteForm.paymentMethods}
                onChange={updateField}
                placeholder="Moyens de paiement acceptés"
              />


              <label style={labelStyle}>
                Termes et conditions de paiement
              </label>

              <textarea
                style={{
                  ...fieldStyle,
                  minHeight: "210px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: "1.5",
                }}
                name="paymentTerms"
                value={quoteForm.paymentTerms}
                onChange={updateField}
                placeholder="Termes et conditions de paiement"
              />

            </div>


            <label style={labelStyle}>
              Notes
            </label>

            <textarea
              style={{
                ...fieldStyle,
                minHeight: "80px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              name="notes"
              value={quoteForm.notes}
              onChange={updateField}
              placeholder="Informations complémentaires"
            />

          </div>


          {/* =========================
              RÉSUMÉ
          ========================= */}

          <div style={cardStyle}>

            <div className="admin-section-title">
              Résumé du devis
            </div>


            {quoteItems.map((item, index) => (

              <div
                key={item.id}
                className="admin-summary-product"
              >

                <div className="admin-summary-product-name">

                  <span>
                    {index + 1}.
                  </span>

                  <strong>
                    {item.name}
                  </strong>

                </div>


                <div className="admin-summary-product-values">

                  <span>
                    {item.quantity}
                    {" × "}
                    {money(item.unitPrice)}
                  </span>

                  <strong>
                    {money(item.total)}
                  </strong>

                </div>

              </div>
            ))}


            {deliveryCost > 0 && (

              <div className="admin-summary-row">

                <span>
                  Livraison
                </span>

                <strong>
                  {money(deliveryCost)}
                </strong>

              </div>

            )}


            <div className="admin-summary-total">

              <span>
                TOTAL
              </span>

              <strong>
                {money(total)}
              </strong>

            </div>

          </div>


          {/* =========================
              ACTIONS
          ========================= */}

          <div className="admin-form-actions">

            {selectedQuote?.finalQuote && (

              <button
                type="button"
                className="admin-preview-button"
                onClick={() =>
                  setShowQuoteSheet(true)
                }
              >
                Voir le devis actuel
              </button>

            )}


            <button
              type="button"
              className="admin-send-button"
              onClick={sendQuote}
              disabled={sendingQuote}
            >
              {sendingQuote
                ? "Envoi en cours..."
                : selectedQuote?.finalQuote
                  ? "Mettre à jour le devis"
                  : "Envoyer le devis"}
            </button>

          </div>


        </div>


        <AdminBottomNav
          onOpenAdminHome={onOpenAdminHome}
          onOpenMachines={onOpenMachines}
          onOpenAdminLive={onOpenAdminLive}
          onOpenQuotes={onOpenQuotes}
          onOpenAdminChat={onOpenAdminChat}
        />
{quoteToDelete && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 10000,
      background: "rgba(15, 23, 42, 0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-delete-quote-title"
      style={{
        width: "100%",
        maxWidth: "380px",
        padding: "24px",
        borderRadius: "20px",
        background: "#ffffff",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
      }}
    >
      <h2
        id="admin-delete-quote-title"
        style={{
          margin: "0 0 12px",
          fontSize: "20px",
          color: "#182b46",
        }}
      >
        Retirer ce devis ?
      </h2>

      <p
        style={{
          margin: "0 0 20px",
          color: "#667085",
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        Il sera retiré de votre liste admin et restera
        disponible chez le client.
      </p>

      {deleteError && (
        <p
          role="alert"
          style={{
            color: "#c52b49",
            fontSize: "13px",
            overflowWrap: "anywhere",
          }}
        >
          {deleteError}
        </p>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          autoFocus
          disabled={deletingQuote}
          onClick={() => setQuoteToDelete(null)}
          style={{
            flex: 1,
            padding: "12px",
            border: "1px solid #dce4ee",
            borderRadius: "12px",
            background: "#f4f7fb",
            color: "#344761",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          Annuler
        </button>

        <button
          type="button"
          disabled={deletingQuote}
          onClick={confirmDeleteQuote}
          style={{
            flex: 1,
            padding: "12px",
            border: "none",
            borderRadius: "12px",
            background: "#e11d48",
            color: "#ffffff",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          {deletingQuote ? "Suppression…" : "Supprimer"}
        </button>
      </div>
    </div>
  </div>
)}
        <AdminQuoteStyles />

      </div>
    );
  }


  /* =========================================
     LISTE DES DEMANDES
  ========================================= */

  return (

    <div className="admin-quotes-page">

      <div className="admin-quotes-header">

       <button
  type="button"
  className="admin-quotes-back"
  onClick={onBack}
>
  ←
</button>


        <div className="admin-quotes-header-text">

          <h1>
            Demandes de devis
          </h1>

          <p>
            Gérez les demandes des clients
          </p>

        </div>

      </div>


      <div className="admin-quotes-content">

        {loading && (

          <div className="admin-empty-card">

            <div className="admin-empty-icon">
              ⏳
            </div>

            <h2>
              Chargement...
            </h2>

            <p>
              Chargement des demandes de devis.
            </p>

          </div>
        )}


        {!loading &&
          quotes.length === 0 && (

            <div className="admin-empty-card">

              <div className="admin-empty-icon">
                📄
              </div>

              <h2>
                Aucune demande
              </h2>

              <p>
                Aucune demande de devis n'a encore été reçue.
              </p>

            </div>
          )}


        {!loading &&
          quotes.length > 0 && (

            <div className="admin-quotes-list">

              {quotes.map((quote) => {
  const hasFinalQuote = Boolean(quote.finalQuote);

  const product =
    quote.productName ||
    quote.product?.name ||
    quote.subject ||
    quote.finalQuote?.description ||
    "Demande de devis";

  const date = dateFR(quote.createdAt);

  const finalTotal = Number(
    quote.finalQuote?.total || 0
  );

  return (
    <div
      key={quote.id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
      }}
    >
      <button
        type="button"
        className="admin-quote-card"
        onClick={(event) => {
          event.stopPropagation();
          openQuote(quote);
        }}
        style={{
          flex: "1 1 0",
          minWidth: 0,
          width: "auto",
          position: "relative",
        }}
      >
        <div className="admin-quote-card-top">
          <div className="admin-quote-card-icon">
            📄
          </div>

          <div className="admin-quote-card-content">
            <div className="admin-quote-card-title">
              <strong>
                {clientName(quote)}
              </strong>

              {hasFinalQuote ? (
                <span className="admin-status-sent">
                  Devis envoyé
                </span>
              ) : (
                <span className="admin-status-waiting">
                  En attente
                </span>
              )}
            </div>

            <div className="admin-quote-product">
              {product}
            </div>

            {date && (
              <div className="admin-quote-date">
                Demande du {date}
              </div>
            )}
          </div>

          <div className="admin-quote-arrow">
            ›
          </div>
        </div>

        {hasFinalQuote && (
          <div className="admin-quote-card-bottom">
            <span>
              {quote.finalQuote?.quoteNumber || "Devis"}
            </span>

            <strong>
              {money(finalTotal)}
            </strong>
          </div>
        )}
      </button>

      <button
        type="button"
        aria-label="Retirer ce devis de la liste admin"
        title="Retirer ce devis"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          deleteQuote(quote);
        }}
        style={{
          position: "static",
          flex: "0 0 40px",
          width: "40px",
          height: "40px",
          padding: 0,
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #f3d1d8",
          borderRadius: "50%",
          background: "#fff1f3",
          color: "#c52b49",
          fontSize: "24px",
          lineHeight: "1",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
      >
        ×
      </button>
    </div>
  );
})}

            </div>

          )}

      </div>


            <AdminBottomNav
        onOpenAdminHome={onOpenAdminHome}
        onOpenMachines={onOpenMachines}
        onOpenAdminLive={onOpenAdminLive}
        onOpenQuotes={onOpenQuotes}
        onOpenAdminChat={onOpenAdminChat}
      />

      {quoteToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-list-delete-title"
            style={{
              width: "100%",
              maxWidth: "380px",
              padding: "24px",
              borderRadius: "20px",
              background: "#ffffff",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h2
              id="admin-list-delete-title"
              style={{
                margin: "0 0 12px",
                fontSize: "20px",
                color: "#182b46",
              }}
            >
              Retirer ce devis ?
            </h2>

            <p
              style={{
                margin: "0 0 20px",
                color: "#667085",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              Il sera retiré de votre liste admin et
              restera disponible chez le client.
            </p>

            {deleteError && (
              <p
                role="alert"
                style={{
                  color: "#c52b49",
                  fontSize: "13px",
                  overflowWrap: "anywhere",
                }}
              >
                {deleteError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                type="button"
                autoFocus
                disabled={deletingQuote}
                onClick={() => setQuoteToDelete(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "1px solid #dce4ee",
                  borderRadius: "12px",
                  background: "#f4f7fb",
                  color: "#344761",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={deletingQuote}
                onClick={confirmDeleteQuote}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#e11d48",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {deletingQuote
                  ? "Suppression…"
                  : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminQuoteStyles />

    </div>
  );
}


/* =========================================
   STYLES
========================================= */

function AdminQuoteStyles() {

  return (

    <style>
      {`

        * {
          box-sizing: border-box;
        }

        .admin-quotes-page {
          width: 100%;
          min-height: 100vh;
          padding-bottom: 82px;
          background: #f5f7fa;
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
        }

        .admin-quotes-header {
          width: 100%;
          min-height: 82px;
          padding: 15px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          border-bottom: 1px solid #e5e9ef;
          position: relative;
          z-index: 20;
        }

        .admin-quotes-back {
          width: 42px;
          height: 42px;
          padding: 0;
          border: none;
          background: transparent;
          color: #172033;
          font-size: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .admin-quotes-header-text {
          min-width: 0;
        }

        .admin-quotes-header-text h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: #172033;
        }

        .admin-quotes-header-text p {
          margin: 4px 0 0;
          font-size: 11px;
          color: #7b8493;
        }

        .admin-quotes-content {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
          padding: 18px 14px 35px;
        }

        .admin-quotes-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .admin-quote-card {
          width: 100%;
          padding: 16px;
          border: 1px solid #e3e8ef;
          border-radius: 15px;
          background: #ffffff;
          color: inherit;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 3px 14px rgba(18,63,95,.06);
        }

        .admin-quote-card-top {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .admin-quote-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #edf4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .admin-quote-card-content {
          flex: 1;
          min-width: 0;
        }

        .admin-quote-card-title {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .admin-quote-card-title strong {
          color: #172033;
          font-size: 14px;
        }

        .admin-status-sent,
        .admin-status-waiting {
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 8px;
          font-weight: 800;
          white-space: nowrap;
        }

        .admin-status-sent {
          background: #dcfce7;
          color: #15803d;
        }

        .admin-status-waiting {
          background: #fef3c7;
          color: #a16207;
        }

        .admin-quote-product {
          margin-top: 5px;
          color: #174b91;
          font-size: 11px;
          font-weight: 700;
        }

        .admin-quote-date {
          margin-top: 5px;
          color: #929aa7;
          font-size: 9px;
        }

        .admin-quote-arrow {
          padding-top: 4px;
          color: #a4abb5;
          font-size: 27px;
          line-height: 1;
          flex-shrink: 0;
        }

        .admin-quote-card-bottom {
          margin-top: 13px;
          padding-top: 11px;
          border-top: 1px solid #eef0f3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #174b91;
          font-size: 11px;
        }

        .admin-quote-card-bottom strong {
          font-size: 13px;
        }

        .admin-empty-card {
          width: 100%;
          padding: 50px 20px;
          border-radius: 17px;
          background: #ffffff;
          text-align: center;
          box-shadow: 0 4px 15px rgba(15,23,42,.04);
        }

        .admin-empty-icon {
          margin-bottom: 12px;
          font-size: 44px;
        }

        .admin-empty-card h2 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .admin-empty-card p {
          margin: 0;
          color: #7b8493;
          font-size: 12px;
        }

        .admin-quote-form-page {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 18px 14px 35px;
        }

        .admin-section-title {
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid #edf0f4;
          color: #174b91;
          font-size: 16px;
          font-weight: 900;
        }

        .admin-client-name {
          margin-bottom: 8px;
          color: #172033;
          font-size: 16px;
          font-weight: 800;
        }

        .admin-client-info {
          margin-top: 5px;
          color: #697384;
          font-size: 11px;
        }

        .admin-request-product {
          margin-top: 15px;
          padding: 12px;
          border-radius: 10px;
          background: #f4f7fb;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .admin-request-product span {
          color: #7b8493;
          font-size: 9px;
        }

        .admin-request-product strong {
          color: #174b91;
          font-size: 13px;
        }

        .admin-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .admin-main-line-title {
          margin-top: 25px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #eef4fb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #174b91;
        }

        .admin-main-line-title span {
          font-size: 13px;
          font-weight: 900;
        }

        .admin-main-line-title small {
          font-size: 9px;
          color: #6c7887;
        }

        .admin-main-line-total {
          margin-top: 13px;
          padding: 11px 13px;
          border-radius: 9px;
          background: #f5f7fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 11px;
        }

        .admin-main-line-total strong {
          color: #174b91;
          font-size: 13px;
        }

        .admin-extra-lines-section {
          margin-top: 25px;
          padding-top: 20px;
          border-top: 2px solid #edf0f4;
        }

        .admin-extra-lines-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 14px;
        }

        .admin-extra-lines-header h3 {
          margin: 0;
          color: #172033;
          font-size: 15px;
          font-weight: 900;
        }

        .admin-extra-lines-header p {
          margin: 4px 0 0;
          color: #7b8493;
          font-size: 9px;
          line-height: 1.4;
        }

        .admin-add-line-button {
          min-height: 42px;
          padding: 9px 15px;
          border: none;
          border-radius: 10px;
          background: #174b91;
          color: #ffffff;
          font-family: inherit;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
          flex-shrink: 0;
        }

        .admin-no-extra-line {
          padding: 17px 12px;
          border: 1px dashed #cbd5df;
          border-radius: 10px;
          background: #fafbfc;
          color: #8993a1;
          font-size: 10px;
          text-align: center;
        }

        .admin-extra-line-card {
          margin-top: 12px;
          padding: 15px;
          border: 1px solid #dce4ec;
          border-radius: 12px;
          background: #fafcff;
        }

        .admin-extra-line-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-bottom: 9px;
          border-bottom: 1px solid #e5eaf0;
        }

        .admin-extra-line-top strong {
          color: #174b91;
          font-size: 12px;
        }

        .admin-remove-line-button {
          min-height: 30px;
          padding: 5px 10px;
          border: 1px solid #efb6b6;
          border-radius: 7px;
          background: #fff5f5;
          color: #c62828;
          font-family: inherit;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-extra-line-total {
          margin-top: 13px;
          padding: 10px 12px;
          border-radius: 8px;
          background: #edf4ff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 10px;
        }

        .admin-extra-line-total strong {
          color: #174b91;
          font-size: 12px;
        }

        .admin-extra-lines-total {
          margin-top: 14px;
          padding: 12px 13px;
          border-radius: 9px;
          background: #e8f0fb;
          color: #174b91;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
          font-weight: 800;
        }

        .admin-quote-calculation {
          margin-top: 20px;
          border: 1px solid #e2e7ed;
          border-radius: 11px;
          overflow: hidden;
        }

        .admin-quote-calculation > div {
          min-height: 42px;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid #edf0f4;
          font-size: 11px;
        }

        .admin-quote-calculation > div:last-child {
          border-bottom: none;
        }

        .admin-quote-total {
          background: #174b91;
          color: #ffffff;
          font-size: 13px !important;
          font-weight: 900;
        }

        .admin-summary-product {
          padding: 11px 0;
          border-bottom: 1px solid #edf0f4;
        }

        .admin-summary-product-name {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          color: #172033;
          font-size: 11px;
        }

        .admin-summary-product-values {
          margin-top: 7px;
          padding-left: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 10px;
        }

        .admin-summary-row {
          min-height: 39px;
          padding: 8px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          border-bottom: 1px solid #edf0f4;
          font-size: 11px;
        }

        .admin-summary-total {
          margin-top: 12px;
          padding: 13px;
          border-radius: 9px;
          background: #174b91;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          font-size: 14px;
          font-weight: 900;
        }

        .admin-form-actions {
          width: 100%;
          margin: 18px 0;
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }

        .admin-form-actions button {
          min-height: 49px;
          padding: 10px 15px;
          border-radius: 11px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-preview-button {
          border: 2px solid #174b91;
          background: #ffffff;
          color: #174b91;
        }

        .admin-send-button {
          border: none;
          background: #174b91;
          color: #ffffff;
        }

        .admin-send-button:disabled {
          opacity: .6;
          cursor: default;
        }

        .admin-mini-preview-title {
          margin: 25px 0 12px;
          color: #172033;
          font-size: 16px;
          font-weight: 900;
        }

        .admin-mini-preview-wrapper {
          width: 100%;
          height: 570px;
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          background: #e8edf3;
          box-shadow: 0 4px 16px rgba(15,23,42,.08);
        }

        .admin-mini-preview-scale {
          position: absolute;
          top: 15px;
          left: 50%;
          width: 794px;
          height: 1123px;
          transform:
            translateX(-50%)
            scale(.47);
          transform-origin: top center;
          background: #ffffff;
        }


        /* ==========================
           APERÇU COMPLET
        ========================== */

        .admin-quote-preview-page {
          width: 100%;
          max-width: 830px;
          margin: 0 auto;
          padding: 15px 8px 18px;
        }

        .admin-quote-wrapper {
          width: 100%;
          max-width: 794px;
          margin: 0 auto;
        }

        .admin-quote-scale {
          width: 794px;
          margin: 0;
          padding: 0;
          overflow: visible;
          background: transparent;
        }

        .admin-quote-preview-actions {
          width: 100%;
          max-width: 794px;
          margin: 18px auto 0;
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 9px;
        }

        .admin-quote-preview-actions button {
          min-height: 48px;
          padding: 8px;
          border-radius: 11px;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-edit-quote-button {
          border: 2px solid #174b91;
          background: #ffffff;
          color: #174b91;
        }

        .admin-print-quote-button {
          border: none;
          background: #174b91;
          color: #ffffff;
        }

        .admin-close-quote-button {
          border: 1px solid #d7dce3;
          background: #ffffff;
          color: #525b68;
        }


        /* ==========================
           BARRE ADMIN
        ========================== */

        .admin-bottom-nav {
          position: fixed;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          width: 100%;
          max-width: 760px;
          height: 66px;
          padding: 4px 5px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          background: #ffffff;
          border-top: 1px solid #e2e7ed;
          box-shadow: 0 -3px 14px rgba(15,23,42,.08);
          z-index: 9999;
        }

        .admin-bottom-nav-item {
          width: 100%;
          height: 57px;
          padding: 3px 2px;
          border: none;
          background: transparent;
          color: #7b8493;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          font-family: inherit;
          font-size: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-bottom-nav-icon {
          min-height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          line-height: 1;
        }

        .admin-bottom-nav-item.active {
          color: #174b91;
          font-weight: 900;
        }

        .admin-live-nav-icon {
          width: 25px;
          height: 25px;
          min-height: 25px;
          border-radius: 50%;
          background: #174b91;
          color: #ffffff;
          font-size: 10px;
        }


        /* ==========================
           MOBILE
        ========================== */

        @media (max-width: 560px) {

          .admin-quotes-page {
            padding-bottom: 72px;
          }

          .admin-quotes-header {
            min-height: 70px;
            padding: 10px 9px;
            gap: 7px;
          }

          .admin-quotes-back {
            width: 36px;
            height: 36px;
            font-size: 25px;
          }

          .admin-quotes-header-text h1 {
            font-size: 18px;
          }

          .admin-quotes-content,
          .admin-quote-form-page {
            padding: 11px 8px 25px;
          }

          .admin-form-grid {
            grid-template-columns: 1fr;
          }

          .admin-extra-lines-header {
            align-items: stretch;
            flex-direction: column;
          }

          .admin-add-line-button {
            width: 100%;
          }

          .admin-form-actions {
            grid-template-columns: 1fr;
          }

          .admin-mini-preview-wrapper {
            height: 510px;
          }

          .admin-mini-preview-scale {
            transform:
              translateX(-50%)
              scale(.42);
          }

          .admin-quote-preview-page {
            width: 100%;
            max-width: 100%;
            padding: 7px 5px 18px;
          }

          .admin-quote-wrapper {
            width: 100%;
            max-width: 100%;
          }

          .admin-quote-preview-actions {
            margin-top: 18px;
            grid-template-columns:
              1fr 1fr;
          }

          .admin-close-quote-button {
            grid-column: 1 / -1;
          }

          .admin-bottom-nav {
            width: 100%;
            max-width: none;
            height: 64px;
            padding: 3px 2px;
          }

          .admin-bottom-nav-item {
            height: 56px;
            font-size: 7px;
          }
        }


        /* ==========================
           IMPRESSION
        ========================== */

        @media print {

          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body,
          #root {
            width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          body {
            position: static !important;
          }

          body * {
            visibility: hidden !important;
          }

          #umi-quote-document,
          #umi-quote-document * {
            visibility: visible !important;
          }

          .no-print,
          .admin-bottom-nav,
          .admin-quotes-header,
          .admin-quote-preview-actions {
            display: none !important;
          }

          .admin-quotes-page,
          .admin-quote-preview-page,
          .admin-quote-wrapper,
          .admin-quote-scale {
            width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;

            margin: 0 !important;
            padding: 0 !important;

            position: static !important;

            transform: none !important;

            overflow: visible !important;

            background: transparent !important;
          }

          #umi-quote-document {
            display: block !important;

            position: absolute !important;

            top: 0 !important;
            left: 0 !important;

            width: 210mm !important;

            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;

            margin: 0 !important;
            padding: 0 !important;

            transform: none !important;

            overflow: visible !important;

            background: #ffffff !important;
          }

          .umi-quote-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;

            margin: 0 !important;

            box-sizing: border-box !important;

            overflow: hidden !important;

            break-after: page;
            page-break-after: always;

            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .umi-quote-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
        }

      `}
    </style>
  );
}


export default AdminQuotes;