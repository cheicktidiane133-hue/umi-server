import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  auth,
  db,
} from "./firebase";

import QuoteDocument from "./QuoteDocument";
import { useUmiDialog } from "./UmiDialogProvider";
import "./Home.css";


function MyQuotes({
  onBack,
  onHome,
  onMachines,
  onLive,
  onCart,
  onAccount,
}) {
  const { umiAlert, umiConfirm } = useUmiDialog();


  /* ==============================
     ÉTATS PRINCIPAUX
  ============================== */

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


const deleteQuote = async (quote) => {
  if (!quote?.id) return;

  const confirmed = await umiConfirm(
    "Il sera retiré de votre liste et restera disponible chez l’admin.",
    {
      title: "Retirer ce devis ?",
      confirmText: "Retirer",
      danger: true,
    }
  );

  if (!confirmed) return;

  try {
    await updateDoc(
      doc(db, "quotes", quote.id),
      {
        clientDeleted: true,
      }
    );

    setQuotes((current) =>
      current.filter(
        (item) => item.id !== quote.id
      )
    );

    setSelectedQuote((current) =>
      current?.id === quote.id
        ? null
        : current
    );

    setEditingRequest(false);
  } catch (error) {
    console.error(
      "Erreur retrait devis client :",
      error
    );

    await umiAlert(
      "Impossible de retirer le devis.\n\n" +
      (error?.message || ""),
      {
        title: "Retrait impossible",
        danger: true,
      }
    );
  }
};


const [
  savingPdf,
  setSavingPdf,
] = useState(false);
  const [
    quoteScale,
    setQuoteScale,
  ] = useState(1);


  const [
    quotePageCount,
    setQuotePageCount,
  ] = useState(1);


  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);


  /* ==============================
     MODIFICATION DEMANDE CLIENT
  ============================== */

  const [
    editingRequest,
    setEditingRequest,
  ] = useState(false);


  const [
    savingRequest,
    setSavingRequest,
  ] = useState(false);


  /* ==============================
     FORMULAIRE MODIFICATION
  ============================== */

  const [
    editForm,
    setEditForm,
  ] = useState({

    clientName: "",

    phone: "",

    email: "",

    companyName: "",

    subject: "",

    quantity: "",

    country: "",

    budget: "",

    message: "",

  });


  /* ==============================
     RÉFÉRENCES
  ============================== */

  const quoteWrapperRef =
    useRef(null);


  const quoteDocumentRef =
    useRef(null);


  /* ==============================
     UTILISATEUR CONNECTÉ
  ============================== */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(

        auth,

        (user) => {

          setCurrentUser(
            user || null
          );

        }

      );


    return () => {

      unsubscribe();

    };

  }, []);


  /* ==============================
     CHARGEMENT DES DEVIS FIREBASE
  ============================== */

  useEffect(() => {

    if (!currentUser?.uid) {

      setQuotes([]);

      setLoading(false);

      return;

    }


    setLoading(true);


    const quotesRef =
      collection(
        db,
        "quotes"
      );


    const quotesQuery =
      query(

        quotesRef,

        where(
          "userId",
          "==",
          currentUser.uid
        ),

        orderBy(
          "createdAt",
          "desc"
        )

      );


    const unsubscribe =
      onSnapshot(

        quotesQuery,

        (snapshot) => {

                    const loadedQuotes = snapshot.docs
            .map((document) => ({
              ...document.data(),
              id: document.id,
            }))
            .filter(
              (quote) => quote.clientDeleted !== true
            );


          setQuotes(
            loadedQuotes
          );


          setSelectedQuote(
            (current) => {

              if (!current) {
                return null;
              }


              const updated =
                loadedQuotes.find(
                  (quote) =>
                    quote.id ===
                    current.id
                );


              return (
                updated ||
                current
              );

            }
          );


          setLoading(false);

        },

        (error) => {

          console.error(
            "Erreur chargement devis :",
            error
          );


          setQuotes([]);

          setLoading(false);

        }

      );


    return () => {

      unsubscribe();

    };

  }, [
    currentUser?.uid,
  ]);


  /* ==============================
     RESPONSIVE DOCUMENT A4
  ============================== */

  useEffect(() => {

    if (
      !selectedQuote ||
      !selectedQuote.finalQuote
    ) {
      return;
    }


    const calculateScale =
      () => {

        const wrapper =
          quoteWrapperRef.current;


        if (!wrapper) {
          return;
        }


        const availableWidth =
          wrapper.clientWidth;


        if (
          !availableWidth ||
          availableWidth <= 0
        ) {
          return;
        }


        const originalWidth =
          794;


        const newScale =
          Math.min(

            1,

            availableWidth /
              originalWidth

          );


        setQuoteScale(
          newScale
        );

      };


    calculateScale();


    const timer =
      window.setTimeout(
        calculateScale,
        100
      );


    window.addEventListener(
      "resize",
      calculateScale
    );


    return () => {

      window.clearTimeout(
        timer
      );


      window.removeEventListener(
        "resize",
        calculateScale
      );

    };

  }, [
    selectedQuote,
  ]);


  /* ==============================
     NOMBRE DE PAGES DU DEVIS
  ============================== */

  useEffect(() => {

    if (
      !selectedQuote ||
      !selectedQuote.finalQuote
    ) {

      setQuotePageCount(1);

      return;

    }


    const detectPages = () => {

      const documentElement =
        quoteDocumentRef.current;


      if (!documentElement) {
        return;
      }


      const pages =
        documentElement.querySelectorAll(
          ".umi-quote-page"
        );


      setQuotePageCount(
        Math.max(
          1,
          pages.length
        )
      );

    };


    detectPages();


    const timer1 =
      window.setTimeout(
        detectPages,
        100
      );


    const timer2 =
      window.setTimeout(
        detectPages,
        500
      );


    return () => {

      window.clearTimeout(
        timer1
      );


      window.clearTimeout(
        timer2
      );

    };

  }, [
    selectedQuote,
  ]);


  /* ==============================
     OUVRIR UN DEVIS
  ============================== */

 const handleOpenQuote =
  async (quote) => {

    setEditingRequest(
      false
    );

    setSelectedQuote(
      quote
    );


    /* =========================================
       MARQUER LE DEVIS COMME LU
    ========================================= */

    if (
      quote?.id &&
      quote?.clientSeen !== true
    ) {

      try {

        await updateDoc(
          doc(
            db,
            "quotes",
            quote.id
          ),
          {
            clientSeen: true,
          }
        );


        /* Mise à jour immédiate locale */

        setSelectedQuote(
          (previous) => {

            if (!previous) {
              return previous;
            }

            return {
              ...previous,
              clientSeen: true,
            };

          }
        );


        console.log(
          "✅ Devis marqué comme lu :",
          quote.id
        );


      } catch (error) {

        console.error(
          "❌ Erreur lecture devis client :",
          error
        );

      }

    }


    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  };
  /* ==============================
     FERMER LE DEVIS
  ============================== */

  const handleCloseQuote =
    () => {

      setEditingRequest(
        false
      );


      setSelectedQuote(
        null
      );


      window.scrollTo({

        top: 0,

        behavior: "smooth",

      });

    };


  /* =========================================
     OUVRIR MODIFICATION DE LA DEMANDE
  ========================================= */

  const handleEditRequest =
    () => {

      if (!selectedQuote) {
        return;
      }


      if (
        selectedQuote.finalQuote
      ) {

        umiNotify(
          "Cette demande a déjà été traitée par UMI Group et ne peut plus être modifiée."
        );

        return;

      }


      setEditForm({

        clientName:
          selectedQuote.clientName ||
          "",

        phone:
          selectedQuote.phone ||
          "",

        email:
          selectedQuote.email ||
          "",

        companyName:
          selectedQuote.companyName ||
          "",

        subject:
          selectedQuote.subject ||
          "",

        quantity:
          selectedQuote.quantity ||
          "",

        country:
          selectedQuote.country ||
          "",

        budget:
          selectedQuote.budget ||
          "",

        message:
          selectedQuote.message ||
          "",

      });


      setEditingRequest(
        true
      );


      window.scrollTo({

        top: 0,

        behavior: "smooth",

      });

    };


  /* =========================================
     MODIFIER UN CHAMP
  ========================================= */

  const handleEditField =
    (event) => {

      const {
        name,
        value,
      } = event.target;


      setEditForm(
        (previous) => ({

          ...previous,

          [name]:
            value,

        })
      );

    };


  /* =========================================
     ANNULER LA MODIFICATION
  ========================================= */

  const handleCancelEdit =
    () => {

      setEditingRequest(
        false
      );


      window.scrollTo({

        top: 0,

        behavior: "smooth",

      });

    };


  /* =========================================
     ENREGISTRER LES MODIFICATIONS
  ========================================= */

  const handleSaveRequest =
    async (event) => {

      event.preventDefault();


      if (
        !selectedQuote?.id ||
        savingRequest
      ) {
        return;
      }


      if (
        selectedQuote.finalQuote
      ) {

        setEditingRequest(
          false
        );


        await umiNotify(
          "Cette demande vient d'être traitée par UMI Group. Elle ne peut plus être modifiée."
        );

        return;

      }


      if (
        !editForm
          .clientName
          .trim()
      ) {

        await umiNotify(
          "Indiquez votre nom et prénom."
        );

        return;

      }


      if (
        !editForm
          .phone
          .trim()
      ) {

        await umiNotify(
          "Indiquez votre numéro de téléphone."
        );

        return;

      }


      if (
        !editForm
          .email
          .trim()
      ) {

        await umiNotify(
          "Indiquez votre adresse e-mail."
        );

        return;

      }


      if (
        !editForm
          .subject
          .trim()
      ) {

        await umiNotify(
          "Indiquez l'objet de votre demande."
        );

        return;

      }


      if (
        !editForm
          .message
          .trim()
      ) {

        await umiNotify(
          "Décrivez votre besoin."
        );

        return;

      }


      try {

        setSavingRequest(
          true
        );


        const quoteRef =
          doc(
            db,
            "quotes",
            selectedQuote.id
          );


        await updateDoc(

          quoteRef,

          {

            clientName:
              editForm
                .clientName
                .trim(),

            phone:
              editForm
                .phone
                .trim(),

            email:
              editForm
                .email
                .trim(),

            companyName:
              editForm
                .companyName
                .trim(),

            subject:
              editForm
                .subject
                .trim(),

            quantity:
              editForm
                .quantity
                .trim(),

            country:
              editForm
                .country
                .trim(),

            budget:
              editForm
                .budget
                .trim(),

            message:
              editForm
                .message
                .trim(),

            status:
              "Nouvelle",

            clientUpdatedAt:
              serverTimestamp(),

          }

        );


        setSelectedQuote(
          (previous) => ({

            ...previous,

            clientName:
              editForm
                .clientName
                .trim(),

            phone:
              editForm
                .phone
                .trim(),

            email:
              editForm
                .email
                .trim(),

            companyName:
              editForm
                .companyName
                .trim(),

            subject:
              editForm
                .subject
                .trim(),

            quantity:
              editForm
                .quantity
                .trim(),

            country:
              editForm
                .country
                .trim(),

            budget:
              editForm
                .budget
                .trim(),

            message:
              editForm
                .message
                .trim(),

            status:
              "Nouvelle",

          })
        );


        setEditingRequest(
          false
        );


        await umiNotify(
          "Votre demande de devis a été modifiée avec succès."
        );

      } catch (error) {

        console.error(
          "Erreur modification demande :",
          error
        );


        await umiNotify(
          "Impossible de modifier votre demande."
        );

      } finally {

        setSavingRequest(
          false
        );

      }

    };


   /* ==============================
     ENREGISTRER LE DEVIS ET SES ANNEXES
  ============================== */

  const waitForQuoteImages = async (element) => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(
      element.querySelectorAll("img")
    );

    await Promise.all(
      images.map(async (image) => {
        if (!image.complete) {
          await new Promise((resolve, reject) => {
            image.addEventListener(
              "load",
              resolve,
              { once: true }
            );

            image.addEventListener(
              "error",
              () => reject(
                new Error(
                  "Une photo du devis ne peut pas être chargée."
                )
              ),
              { once: true }
            );
          });
        }

        if (!image.naturalWidth) {
          throw new Error(
            "Une photo du devis ne peut pas être chargée."
          );
        }

        if (typeof image.decode === "function") {
          await image.decode();
        }
      })
    );
  };

    const handleSaveQuote = async () => {
    if (savingPdf || !selectedQuote?.finalQuote) {
      return;
    }

    const source = quoteDocumentRef.current;

    if (!source) {
      await umiNotify("Impossible de trouver le devis.");
      return;
    }

    setSavingPdf(true);

    let captureContainer = null;

    try {
      captureContainer = document.createElement("div");

      Object.assign(captureContainer.style, {
        position: "absolute",
        left: "-10000px",
        top: "0",
        width: "794px",
        background: "#ffffff",
        pointerEvents: "none",
      });

      const clonedDocument = source.cloneNode(true);

      clonedDocument.removeAttribute("id");

      clonedDocument.querySelectorAll("[id]").forEach(
        (element) => element.removeAttribute("id")
      );

      Object.assign(clonedDocument.style, {
        position: "static",
        width: "794px",
        height: "auto",
        maxHeight: "none",
        transform: "none",
        overflow: "visible",
        margin: "0",
      });

      captureContainer.appendChild(clonedDocument);
      document.body.appendChild(captureContainer);

      const pages = Array.from(
        clonedDocument.querySelectorAll(".umi-quote-page")
      );

      if (!pages.length) {
        throw new Error("Aucune page de devis trouvée.");
      }

      for (const page of pages) {
        Object.assign(page.style, {
          width: "794px",
          height: "1123px",
          minHeight: "1123px",
          maxHeight: "1123px",
          margin: "0",
          transform: "none",
          flexShrink: "0",
        });
      }

      await waitForQuoteImages(clonedDocument);

      /* Préparer les photos sans les déformer */

      const images = Array.from(
        clonedDocument.querySelectorAll("img")
      );

      for (const image of images) {
        const computedStyle =
          window.getComputedStyle(image);

        if (computedStyle.objectFit !== "contain") {
          continue;
        }

        const boxWidth = image.clientWidth;
        const boxHeight = image.clientHeight;

        if (
          boxWidth <= 0 ||
          boxHeight <= 0 ||
          !image.naturalWidth ||
          !image.naturalHeight
        ) {
          throw new Error(
            "Impossible de calculer les dimensions d'une photo."
          );
        }

        const ratio = Math.min(
          boxWidth / image.naturalWidth,
          boxHeight / image.naturalHeight
        );

        const photoWidth =
          image.naturalWidth * ratio;

        const photoHeight =
          image.naturalHeight * ratio;

        /* Le cadre conserve la place de l'image originale. */

        const frame = document.createElement("div");

        frame.className = image.className;
        frame.style.cssText = image.style.cssText;

        Object.assign(frame.style, {
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
          boxSizing: "border-box",
          padding: "0",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: "0",
        });

        if (computedStyle.position === "absolute") {
          Object.assign(frame.style, {
            position: "absolute",
            left: computedStyle.left,
            top: computedStyle.top,
            right: "auto",
            bottom: "auto",
          });
        }

        image.replaceWith(frame);

        image.removeAttribute("class");
        image.removeAttribute("width");
        image.removeAttribute("height");
        image.removeAttribute("style");

        /* Largeur et hauteur respectent le format original. */

        const imageStyles = {
          position: "static",
          display: "block",
          width: `${photoWidth}px`,
          height: `${photoHeight}px`,
          minWidth: `${photoWidth}px`,
          maxWidth: `${photoWidth}px`,
          minHeight: `${photoHeight}px`,
          maxHeight: `${photoHeight}px`,
          margin: "0",
          padding: "0",
          border: "none",
          transform: "none",
          flex: "0 0 auto",
          objectFit: "fill",
        };

        for (const [property, value] of Object.entries(
          imageStyles
        )) {
          const cssProperty = property.replace(
            /[A-Z]/g,
            (letter) => `-${letter.toLowerCase()}`
          );

          image.style.setProperty(
            cssProperty,
            value,
            "important"
          );
        }

        frame.appendChild(image);
      }

      await waitForQuoteImages(clonedDocument);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (let index = 0; index < pages.length; index++) {
        const canvas = await html2canvas(pages[index], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: 794,
          height: 1123,
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
        });

        if (index > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          0,
          0,
          210,
          297,
          undefined,
          "FAST"
        );

        canvas.width = 0;
        canvas.height = 0;
      }

      const quoteNumber =
        selectedQuote.finalQuote.quoteNumber ||
        selectedQuote.quoteNumber ||
        "UMI";

      const safeQuoteNumber = String(quoteNumber)
        .replace(/[^a-zA-Z0-9_-]/g, "-");

      pdf.save(`Devis-${safeQuoteNumber}.pdf`);
    } catch (error) {
      console.error("Erreur création PDF :", error);

      await umiNotify(
        "Impossible d'enregistrer le devis.\n\n" +
        (error?.message || "")
      );
    } finally {
      captureContainer?.remove();
      setSavingPdf(false);
    }
  };

  /* ==============================
     OUVRIR L'IMPRESSION
  ============================== */

  const handlePrintQuote = async () => {
    if (savingPdf || !selectedQuote?.finalQuote) {
      return;
    }

    const element = quoteDocumentRef.current;

    if (!element) {
      await umiNotify("Impossible de trouver le devis.");
      return;
    }

    setSavingPdf(true);

    try {
      await waitForQuoteImages(element);

      window.print();
    } catch (error) {
      console.error("Erreur impression devis :", error);

      await umiNotify(
        "Impossible de préparer l'impression.\n\n" +
        (error?.message || "")
      );
    } finally {
      setSavingPdf(false);
    }
  };

  /* =========================================
     AFFICHAGE D'UN DEVIS
  ========================================= */

  if (selectedQuote) {

    const hasFinalQuote =
      Boolean(
        selectedQuote.finalQuote
      );


    /* =======================================
       FORMULAIRE MODIFICATION CLIENT
    ======================================= */

    if (
      editingRequest &&
      !hasFinalQuote
    ) {

      return (

        <div className="my-quotes-page">


          {/* =========================
              EN-TÊTE FIXE
          ========================= */}

          <div className="my-quotes-header no-print">

            <button
              type="button"
              className="my-quotes-back"
              onClick={
                handleCancelEdit
              }
            >
              ←
            </button>


            <div className="my-quotes-header-text">

              <h1>
                Modifier ma demande
              </h1>

              <p>
                Modifiez les informations avant le traitement par UMI Group
              </p>

            </div>

          </div>


          {/* =========================
              FORMULAIRE
          ========================= */}

          <div className="client-edit-quote-wrapper">

            <div className="client-edit-quote-card">


              <div className="client-edit-information">

                <div className="client-edit-information-icon">
                  ✏️
                </div>

                <div>

                  <strong>
                    Demande encore modifiable
                  </strong>

                  <p>
                    Vous pouvez modifier votre demande tant que UMI Group n'a pas encore préparé votre devis.
                  </p>

                </div>

              </div>


              <form
                onSubmit={
                  handleSaveRequest
                }
                className="client-edit-form"
              >


                {/* NOM */}

                <div className="client-edit-field">

                  <label htmlFor="clientName">
                    Nom et prénom *
                  </label>

                  <input
                    id="clientName"
                    type="text"
                    name="clientName"
                    value={
                      editForm.clientName
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Votre nom et prénom"
                    required
                  />

                </div>


                {/* TÉLÉPHONE */}

                <div className="client-edit-field">

                  <label htmlFor="phone">
                    Téléphone *
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={
                      editForm.phone
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Votre numéro de téléphone"
                    required
                  />

                </div>


                {/* EMAIL */}

                <div className="client-edit-field">

                  <label htmlFor="email">
                    Adresse e-mail *
                  </label>

                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={
                      editForm.email
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Votre adresse e-mail"
                    required
                  />

                </div>


                {/* ENTREPRISE */}

                <div className="client-edit-field">

                  <label htmlFor="companyName">
                    Entreprise
                  </label>

                  <input
                    id="companyName"
                    type="text"
                    name="companyName"
                    value={
                      editForm.companyName
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Nom de votre entreprise"
                  />

                </div>


                {/* OBJET */}

                <div className="client-edit-field client-edit-field-full">

                  <label htmlFor="subject">
                    Objet de la demande *
                  </label>

                  <input
                    id="subject"
                    type="text"
                    name="subject"
                    value={
                      editForm.subject
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Objet de votre demande"
                    required
                  />

                </div>


                {/* QUANTITÉ */}

                <div className="client-edit-field">

                  <label htmlFor="quantity">
                    Quantité
                  </label>

                  <input
                    id="quantity"
                    type="text"
                    name="quantity"
                    value={
                      editForm.quantity
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Exemple : 1"
                  />

                </div>


                {/* PAYS */}

                <div className="client-edit-field">

                  <label htmlFor="country">
                    Pays de livraison
                  </label>

                  <input
                    id="country"
                    type="text"
                    name="country"
                    value={
                      editForm.country
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Exemple : Mali"
                  />

                </div>


                {/* BUDGET */}

                <div className="client-edit-field client-edit-field-full">

                  <label htmlFor="budget">
                    Budget indicatif
                  </label>

                  <input
                    id="budget"
                    type="text"
                    name="budget"
                    value={
                      editForm.budget
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Votre budget"
                  />

                </div>


                {/* DESCRIPTION */}

                <div className="client-edit-field client-edit-field-full">

                  <label htmlFor="message">
                    Description de votre besoin *
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    value={
                      editForm.message
                    }
                    onChange={
                      handleEditField
                    }
                    placeholder="Décrivez votre besoin..."
                    rows="6"
                    required
                  />

                </div>


                {/* BOUTONS */}

                <div className="client-edit-actions">

                  <button
                    type="button"
                    className="client-edit-cancel"
                    onClick={
                      handleCancelEdit
                    }
                    disabled={
                      savingRequest
                    }
                  >
                    Annuler
                  </button>


                  <button
                    type="submit"
                    className="client-edit-save"
                    disabled={
                      savingRequest
                    }
                  >

                    {savingRequest
                      ? "Enregistrement..."
                      : "✓ Enregistrer les modifications"}

                  </button>

                </div>


              </form>

            </div>

          </div>


          {/* =========================
              BARRE DES TÂCHES
          ========================= */}

          <nav className="bottom-nav no-print">

            <button
              type="button"
              className="bottom-nav-item"
              onClick={onHome}
            >
              <span className="bottom-nav-icon">
                ⌂
              </span>

              <span>
                Accueil
              </span>
            </button>


            <button
              type="button"
              className="bottom-nav-item"
              onClick={onMachines}
            >
              <span className="bottom-nav-icon">
                ▦
              </span>

              <span>
                Machines
              </span>
            </button>


            <button
              type="button"
              className="bottom-nav-item"
              onClick={onLive}
            >
              <span className="bottom-nav-icon live-nav-icon">
                ▶
              </span>

              <span>
                UMI LIVE
              </span>
            </button>


            <button
              type="button"
              className="bottom-nav-item"
              onClick={onCart}
            >
              <span className="bottom-nav-icon">
                🛒
              </span>

              <span>
                Panier
              </span>
            </button>


            <button
              type="button"
              className="bottom-nav-item active"
              onClick={onAccount}
            >
              <span className="bottom-nav-icon">
                ♙
              </span>

              <span>
                Compte
              </span>
            </button>

          </nav>


          <MyQuotesStyles />

        </div>

      );

    }


    /* =======================================
       AFFICHAGE NORMAL DU DEVIS
    ======================================= */

    return (

      <div className="my-quotes-page">


        {/* =========================
            EN-TÊTE FIXE
        ========================= */}

        <div className="my-quotes-header no-print">

          <button
            type="button"
            className="my-quotes-back"
            onClick={
              handleCloseQuote
            }
          >
            ←
          </button>


          <div className="my-quotes-header-text">

            <h1>
              {hasFinalQuote
                ? "Mon devis"
                : "Ma demande de devis"}
            </h1>


            <p>

              {hasFinalQuote

                ? (
                    selectedQuote
                      ?.finalQuote
                      ?.quoteNumber ||

                    selectedQuote
                      ?.quoteNumber ||

                    "UMI Group"
                  )

                : "Demande en attente de traitement"}

            </p>

          </div>

        </div>


        {/* =================================
            SI LE DEVIS EST PRÊT
        ================================= */}

        {hasFinalQuote ? (

          <div className="my-quote-view">


            {/* ======================
                APERÇU DU DEVIS
            ====================== */}

            <div
              ref={quoteWrapperRef}
              className="my-quote-wrapper"
            >

              <div
                className="my-quote-scaled-area"
                style={{
                  width:
                    `${794 * quoteScale}px`,

                  height:
                    `${
                      (
                        (1123 * quotePageCount) +
                        (25 * Math.max(
                          0,
                          quotePageCount - 1
                        ))
                      ) * quoteScale
                    }px`,
                }}
              >

                <div
                  className="my-quote-scale"
                  style={{
                    width: "794px",

                    height: "auto",

                    minHeight:
                      `${1123 * quotePageCount}px`,

                    transform:
                      `scale(${quoteScale})`,

                    transformOrigin:
                      "top left",
                  }}
                >

                  <QuoteDocument
                    quote={selectedQuote}
                    user={currentUser}
                    documentRef={quoteDocumentRef}
                  />

                </div>

              </div>

            </div>


            {/* ======================
                BOUTONS DU DEVIS
            ====================== */}

                        <div className="my-quote-actions no-print">
              <button
                type="button"
                className="save-quote-button"
                onClick={handleSaveQuote}
                disabled={savingPdf}
              >
                <span className="quote-action-icon">
                  ↓
                </span>

                <span>
                  {savingPdf
                    ? "Veuillez patienter…"
                    : "Enregistrer PDF"}
                </span>
              </button>

              <button
                type="button"
                className="print-quote-button"
                onClick={handlePrintQuote}
                disabled={savingPdf}
              >
                <span className="quote-action-icon">
                  🖨
                </span>

                <span>
                  Imprimer
                </span>
              </button>
            </div>

          </div>

        ) : (

          /* =================================
             DEMANDE EN ATTENTE
          ================================= */

          <div className="quote-waiting-wrapper">

            <div className="quote-waiting-card">


              <div className="quote-waiting-icon">
                📄
              </div>


              <div className="quote-waiting-status">
                EN ATTENTE
              </div>


              <h2>
                Votre demande a bien été envoyée
              </h2>


              <p className="quote-waiting-text">
                Votre demande de devis est actuellement en attente de traitement par UMI Group.
              </p>


              {/* ==========================
                  RÉSUMÉ DE LA DEMANDE
              ========================== */}

              <div className="client-request-summary">


                <div className="client-request-summary-title">
                  Votre demande
                </div>


                <div className="client-request-summary-row">

                  <span>
                    Nom
                  </span>

                  <strong>
                    {selectedQuote.clientName ||
                      "—"}
                  </strong>

                </div>


                <div className="client-request-summary-row">

                  <span>
                    Téléphone
                  </span>

                  <strong>
                    {selectedQuote.phone ||
                      "—"}
                  </strong>

                </div>


                <div className="client-request-summary-row">

                  <span>
                    E-mail
                  </span>

                  <strong>
                    {selectedQuote.email ||
                      "—"}
                  </strong>

                </div>


                {selectedQuote.companyName && (

                  <div className="client-request-summary-row">

                    <span>
                      Entreprise
                    </span>

                    <strong>
                      {selectedQuote.companyName}
                    </strong>

                  </div>

                )}


                <div className="client-request-summary-row">

                  <span>
                    Objet
                  </span>

                  <strong>
                    {selectedQuote.subject ||
                      "—"}
                  </strong>

                </div>


                <div className="client-request-summary-row">

                  <span>
                    Quantité
                  </span>

                  <strong>
                    {selectedQuote.quantity ||
                      "—"}
                  </strong>

                </div>


                <div className="client-request-summary-row">

                  <span>
                    Pays
                  </span>

                  <strong>
                    {selectedQuote.country ||
                      "—"}
                  </strong>

                </div>


                <div className="client-request-summary-row">

                  <span>
                    Budget
                  </span>

                  <strong>
                    {selectedQuote.budget ||
                      "—"}
                  </strong>

                </div>


                <div className="client-request-message">

                  <span>
                    Description du besoin
                  </span>

                  <p>
                    {selectedQuote.message ||
                      "—"}
                  </p>

                </div>


              </div>


              {/* ==========================
                  MODIFIER LA DEMANDE
              ========================== */}

              <div className="waiting-actions">


                <button
                  type="button"
                  className="edit-request-button"
                  onClick={
                    handleEditRequest
                  }
                >
                  ✏️ Modifier ma demande
                </button>


                <button
                  type="button"
                  className="waiting-back-button"
                  onClick={
                    handleCloseQuote
                  }
                >
                  ← Retour à mes devis
                </button>


              </div>


              <div className="edit-request-notice">

                <span>
                  ℹ
                </span>

                <p>
                  Vous pouvez modifier cette demande tant que UMI Group n'a pas encore préparé votre devis.
                </p>

              </div>


            </div>

          </div>

        )}


        {/* =========================
            BARRE DES TÂCHES
        ========================= */}

        <nav className="bottom-nav no-print">


          <button
            type="button"
            className="bottom-nav-item"
            onClick={
              onHome
            }
          >

            <span className="bottom-nav-icon">
              ⌂
            </span>

            <span>
              Accueil
            </span>

          </button>


          <button
            type="button"
            className="bottom-nav-item"
            onClick={
              onMachines
            }
          >

            <span className="bottom-nav-icon">
              ▦
            </span>

            <span>
              Machines
            </span>

          </button>


          <button
            type="button"
            className="bottom-nav-item"
            onClick={
              onLive
            }
          >

            <span className="bottom-nav-icon live-nav-icon">
              ▶
            </span>

            <span>
              UMI LIVE
            </span>

          </button>


          <button
            type="button"
            className="bottom-nav-item"
            onClick={
              onCart
            }
          >

            <span className="bottom-nav-icon">
              🛒
            </span>

            <span>
              Panier
            </span>

          </button>


          <button
            type="button"
            className="bottom-nav-item active"
            onClick={
              onAccount
            }
          >

            <span className="bottom-nav-icon">
              ♙
            </span>

            <span>
              Compte
            </span>

          </button>


        </nav>


        <MyQuotesStyles />

      </div>

    );

  }


  /* =========================================
     PAGE PRINCIPALE : MES DEVIS
  ========================================= */

  return (

    <div className="my-quotes-page">


      {/* =========================
          EN-TÊTE FIXE
      ========================= */}

      <div className="my-quotes-header">

        <button
          type="button"
          className="my-quotes-back"
          onClick={
            onBack
          }
        >
          ←
        </button>


        <div className="my-quotes-header-text">

          <h1>
            Mes devis
          </h1>

          <p>
            Consultez vos demandes et vos devis UMI Group
          </p>

        </div>

      </div>


      {/* =========================
          CONTENU
      ========================= */}

      <div className="my-quotes-content">


        {/* =========================
            CHARGEMENT
        ========================= */}

        {loading && (

          <div className="my-quotes-empty">

            <div className="my-quotes-empty-icon">
              ⏳
            </div>

            <h2>
              Chargement...
            </h2>

            <p>
              Récupération de vos devis.
            </p>

          </div>

        )}


        {/* =========================
            PAS CONNECTÉ
        ========================= */}

        {!loading &&
          !currentUser && (

          <div className="my-quotes-empty">

            <div className="my-quotes-empty-icon">
              ♙
            </div>

            <h2>
              Connexion nécessaire
            </h2>

            <p>
              Connectez-vous pour consulter vos demandes de devis.
            </p>

          </div>

        )}


        {/* =========================
            AUCUN DEVIS
        ========================= */}

        {!loading &&
          currentUser &&
          quotes.length === 0 && (

          <div className="my-quotes-empty">

            <div className="my-quotes-empty-icon">
              📄
            </div>

            <h2>
              Aucun devis
            </h2>

            <p>
              Vous n'avez pas encore envoyé de demande de devis.
            </p>

          </div>

        )}


        {/* =========================
            LISTE DES DEVIS
        ========================= */}

        {!loading &&
          currentUser &&
          quotes.length > 0 && (

          <div className="my-quotes-list">

            {quotes.map(
              (quote) => {

                const ready =
                  Boolean(
                    quote.finalQuote
                  );


                const displayDate =
                  quote.createdAt
                    ?.toDate
                    ? quote.createdAt
                        .toDate()
                        .toLocaleDateString(
                          "fr-FR"
                        )
                    : "";


                return (

                  <div
  key={quote.id}
  style={{
    position: "relative",
  }}
>
  <button
    type="button"
    className="my-quote-card"
    onClick={() => handleOpenQuote(quote)}
    style={{
      width: "100%",
      paddingRight: "52px",
    }}
  >
    <div className="my-quote-card-icon">
      📄
    </div>

    <div className="my-quote-card-content">
      <div className="my-quote-card-top">
        <strong>
          {ready
            ? quote?.finalQuote?.quoteNumber || "Devis UMI"
            : "Demande de devis"}
        </strong>

        <span
          className={
            ready
              ? "quote-status-ready"
              : "quote-status-waiting"
          }
          style={
            ready && quote.clientSeen !== true
              ? {
                  background: "#e11d48",
                  color: "#ffffff",
                }
              : undefined
          }
        >
          {ready
            ? quote.clientSeen !== true
              ? "NOUVEAU"
              : "DEVIS PRÊT"
            : "EN ATTENTE"}
        </span>
      </div>

      <div className="my-quote-card-subject">
        {quote.subject ||
          quote.productName ||
          "Demande UMI"}
      </div>

      <div className="my-quote-card-bottom">
        <span>
          {displayDate
            ? `Envoyée le ${displayDate}`
            : "Demande envoyée"}
        </span>

        {!ready && (
          <span className="quote-editable-label">
            ✏️ Modifiable
          </span>
        )}
      </div>
    </div>

    <div className="my-quote-card-arrow">
      ›
    </div>
  </button>

  <button
    type="button"
    aria-label="Supprimer le devis"
    title="Supprimer le devis"
    onClick={() => deleteQuote(quote)}
    style={{
      position: "absolute",
      top: "8px",
      right: "8px",
      width: "40px",
      height: "40px",
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
      zIndex: 2,
    }}
  >
    ×
  </button>
</div>
                );

              }
            )}

          </div>

        )}


      </div>


      {/* =========================
          BARRE DES TÂCHES
      ========================= */}

      <nav className="bottom-nav no-print">


        <button
          type="button"
          className="bottom-nav-item"
          onClick={
            onHome
          }
        >

          <span className="bottom-nav-icon">
            ⌂
          </span>

          <span>
            Accueil
          </span>

        </button>


        <button
          type="button"
          className="bottom-nav-item"
          onClick={
            onMachines
          }
        >

          <span className="bottom-nav-icon">
            ▦
          </span>

          <span>
            Machines
          </span>

        </button>


        <button
          type="button"
          className="bottom-nav-item"
          onClick={
            onLive
          }
        >

          <span className="bottom-nav-icon live-nav-icon">
            ▶
          </span>

          <span>
            UMI LIVE
          </span>

        </button>


        <button
          type="button"
          className="bottom-nav-item"
          onClick={
            onCart
          }
        >

          <span className="bottom-nav-icon">
            🛒
          </span>

          <span>
            Panier
          </span>

        </button>


        <button
          type="button"
          className="bottom-nav-item active"
          onClick={
            onAccount
          }
        >

          <span className="bottom-nav-icon">
            ♙
          </span>

          <span>
            Compte
          </span>

        </button>


      </nav>


      <MyQuotesStyles />

    </div>

  );


  /* =========================================
     STYLES
  ========================================= */

  function MyQuotesStyles() {

    return (

      <style>
        {`

        /* =====================================
           BASE
        ===================================== */

        * {
          box-sizing: border-box;
        }

        .my-quotes-page {
          width: 100%;
          min-height: 100vh;
          padding-bottom: 78px;

          background: #f5f7fa;
          color: #172033;

          font-family: Arial, Helvetica, sans-serif;
        }


        /* =====================================
           EN-TÊTE / BANNIÈRE FIXE
        ===================================== */

        .my-quotes-header {
          width: 100%;
          min-height: 76px;

          padding: 12px 14px;

          display: flex;
          align-items: center;
          gap: 10px;

          background: #ffffff;

          border-bottom: 1px solid #e5e9ef;

          position: sticky;
          top: 0;

          z-index: 9998;

          box-shadow:
            0 2px 8px
            rgba(15, 23, 42, 0.06);
        }


        .my-quotes-back {
          width: 40px;
          height: 40px;

          padding: 0;

          border: none;

          background: transparent;

          color: #172033;

          font-size: 27px;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;

          flex-shrink: 0;
        }


        .my-quotes-header-text {
          min-width: 0;
        }


        .my-quotes-header-text h1 {
          margin: 0;

          color: #172033;

          font-size: 20px;

          font-weight: 900;
        }


        .my-quotes-header-text p {
          margin: 3px 0 0;

          color: #7b8493;

          font-size: 10px;

          line-height: 1.35;
        }


        /* =====================================
           CONTENU MES DEVIS
        ===================================== */

        .my-quotes-content {
          width: 100%;
          max-width: 760px;

          margin: 0 auto;

          padding: 16px 10px 30px;
        }


        .my-quotes-list {
          width: 100%;

          display: flex;
          flex-direction: column;

          gap: 11px;
        }


        /* =====================================
           CARTE DEVIS
        ===================================== */

        .my-quote-card {
          width: 100%;

          padding: 14px;

          border: 1px solid #e1e7ee;
          border-radius: 14px;

          background: #ffffff;

          color: inherit;

          display: flex;
          align-items: center;

          gap: 11px;

          text-align: left;

          font-family: inherit;

          box-shadow:
            0 3px 12px
            rgba(15, 23, 42, 0.045);

          cursor: pointer;
        }


        .my-quote-card-icon {
          width: 43px;
          height: 43px;

          border-radius: 11px;

          background: #edf4ff;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 20px;

          flex-shrink: 0;
        }


        .my-quote-card-content {
          flex: 1;

          min-width: 0;
        }


        .my-quote-card-top {
          display: flex;

          align-items: flex-start;

          justify-content: space-between;

          gap: 8px;
        }


        .my-quote-card-top strong {
          color: #172033;

          font-size: 12px;
        }


        /* =====================================
           STATUT
        ===================================== */

        .quote-status-ready,
        .quote-status-waiting {
          padding: 4px 7px;

          border-radius: 20px;

          font-size: 7px;

          font-weight: 900;

          white-space: nowrap;
        }


        .quote-status-ready {
          background: #dcfce7;

          color: #15803d;
        }


        .quote-status-waiting {
          background: #fef3c7;

          color: #a16207;
        }


        .my-quote-card-subject {
          margin-top: 5px;

          color: #174b91;

          font-size: 10px;

          font-weight: 700;

          white-space: nowrap;
                    overflow: hidden;

          text-overflow: ellipsis;
        }


        .my-quote-card-bottom {
          margin-top: 6px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 8px;

          color: #8b94a1;

          font-size: 8px;
        }


        .quote-editable-label {
          color: #174b91;

          font-weight: 800;
        }


        .my-quote-card-arrow {
          color: #a3abb6;

          font-size: 25px;

          flex-shrink: 0;
        }


        /* =====================================
           ÉTAT VIDE
        ===================================== */

        .my-quotes-empty {
          width: 100%;

          padding: 50px 20px;

          border-radius: 16px;

          background: #ffffff;

          text-align: center;

          box-shadow:
            0 4px 15px
            rgba(15, 23, 42, 0.04);
        }


        .my-quotes-empty-icon {
          margin-bottom: 12px;

          font-size: 42px;
        }


        .my-quotes-empty h2 {
          margin: 0 0 7px;

          font-size: 18px;
        }


        .my-quotes-empty p {
          margin: 0;

          color: #7b8493;

          font-size: 11px;

          line-height: 1.5;
        }


        /* =====================================
           DEMANDE EN ATTENTE
        ===================================== */

        .quote-waiting-wrapper {
          width: 100%;

          max-width: 650px;

          margin: 0 auto;

          padding: 22px 11px 35px;
        }


        .quote-waiting-card {
          width: 100%;

          padding: 25px 18px;

          border-radius: 17px;

          background: #ffffff;

          text-align: center;

          box-shadow:
            0 4px 18px
            rgba(15, 23, 42, 0.06);
        }


        .quote-waiting-icon {
          width: 64px;
          height: 64px;

          margin: 0 auto 12px;

          border-radius: 50%;

          background: #edf4ff;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 29px;
        }


        .quote-waiting-status {
          display: inline-block;

          margin-bottom: 11px;

          padding: 5px 10px;

          border-radius: 20px;

          background: #fef3c7;

          color: #a16207;

          font-size: 8px;

          font-weight: 900;
        }


        .quote-waiting-card h2 {
          margin: 0;

          color: #172033;

          font-size: 18px;

          font-weight: 900;
        }


        .quote-waiting-text {
          max-width: 470px;

          margin: 9px auto 20px;

          color: #717b89;

          font-size: 11px;

          line-height: 1.55;
        }


        /* =====================================
           RÉSUMÉ DEMANDE
        ===================================== */

        .client-request-summary {
          width: 100%;

          margin-top: 20px;

          padding: 15px;

          border: 1px solid #e2e7ed;

          border-radius: 12px;

          background: #fafcff;

          text-align: left;
        }


        .client-request-summary-title {
          margin-bottom: 10px;

          padding-bottom: 9px;

          border-bottom: 1px solid #e5eaf0;

          color: #174b91;

          font-size: 13px;

          font-weight: 900;
        }


        .client-request-summary-row {
          min-height: 36px;

          padding: 7px 0;

          display: flex;

          align-items: flex-start;

          justify-content: space-between;

          gap: 15px;

          border-bottom: 1px solid #edf0f4;

          font-size: 10px;
        }


        .client-request-summary-row span {
          color: #7b8493;
        }


        .client-request-summary-row strong {
          max-width: 60%;

          color: #172033;

          text-align: right;

          overflow-wrap: anywhere;
        }


        .client-request-message {
          padding-top: 12px;
        }


        .client-request-message span {
          color: #7b8493;

          font-size: 10px;

          font-weight: 700;
        }


        .client-request-message p {
          margin: 7px 0 0;

          color: #172033;

          font-size: 10px;

          line-height: 1.55;

          white-space: pre-wrap;
        }


        /* =====================================
           BOUTONS DEMANDE
        ===================================== */

        .waiting-actions {
          width: 100%;

          margin-top: 18px;

          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 9px;
        }


        .edit-request-button,
        .waiting-back-button {
          min-height: 47px;

          padding: 9px 12px;

          border-radius: 10px;

          font-family: inherit;

          font-size: 10px;

          font-weight: 900;

          cursor: pointer;
        }


        .edit-request-button {
          border: none;

          background: #174b91;

          color: #ffffff;
        }


        .waiting-back-button {
          border: 1px solid #d5dce5;

          background: #ffffff;

          color: #536070;
        }


        .edit-request-notice {
          width: 100%;

          margin-top: 14px;

          padding: 10px 12px;

          border-radius: 9px;

          background: #eef4fb;

          color: #174b91;

          display: flex;

          align-items: flex-start;

          gap: 8px;

          text-align: left;
        }


        .edit-request-notice span {
          font-size: 13px;

          font-weight: 900;
        }


        .edit-request-notice p {
          margin: 0;

          font-size: 9px;

          line-height: 1.45;
        }


        /* =====================================
           MODIFICATION DEMANDE
        ===================================== */

        .client-edit-quote-wrapper {
          width: 100%;

          max-width: 700px;

          margin: 0 auto;

          padding: 18px 11px 35px;
        }


        .client-edit-quote-card {
          width: 100%;

          padding: 20px;

          border-radius: 16px;

          background: #ffffff;

          box-shadow:
            0 4px 18px
            rgba(15, 23, 42, 0.06);
        }


        .client-edit-information {
          width: 100%;

          margin-bottom: 20px;

          padding: 13px;

          border-radius: 11px;

          background: #eef4fb;

          display: flex;

          align-items: flex-start;

          gap: 11px;
        }


        .client-edit-information-icon {
          width: 38px;
          height: 38px;

          border-radius: 50%;

          background: #ffffff;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 17px;

          flex-shrink: 0;
        }


        .client-edit-information strong {
          display: block;

          color: #174b91;

          font-size: 12px;
        }


        .client-edit-information p {
          margin: 4px 0 0;

          color: #617187;

          font-size: 9px;

          line-height: 1.45;
        }


        /* =====================================
           FORMULAIRE MODIFICATION
        ===================================== */

        .client-edit-form {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 14px;
        }


        .client-edit-field {
          min-width: 0;
        }


        .client-edit-field-full {
          grid-column: 1 / -1;
        }


        .client-edit-field label {
          display: block;

          margin-bottom: 6px;

          color: #173e59;

          font-size: 10px;

          font-weight: 800;
        }


        .client-edit-field input,
        .client-edit-field textarea {
          width: 100%;

          padding: 12px;

          border: 1px solid #d7e1e8;

          border-radius: 9px;

          outline: none;

          background: #ffffff;

          color: #172033;

          font-family: inherit;

          font-size: 12px;
        }


        .client-edit-field textarea {
          min-height: 115px;

          resize: vertical;
        }


        .client-edit-field input:focus,
        .client-edit-field textarea:focus {
          border-color: #174b91;
        }


        /* =====================================
           BOUTONS MODIFICATION
        ===================================== */

        .client-edit-actions {
          grid-column: 1 / -1;

          margin-top: 8px;

          display: grid;

          grid-template-columns: 1fr 1.4fr;

          gap: 10px;
        }


        .client-edit-cancel,
        .client-edit-save {
          min-height: 49px;

          padding: 10px 12px;

          border-radius: 10px;

          font-family: inherit;

          font-size: 11px;

          font-weight: 900;

          cursor: pointer;
        }


        .client-edit-cancel {
          border: 1px solid #d6dde6;

          background: #ffffff;

          color: #596574;
        }


        .client-edit-save {
          border: none;

          background: #174b91;

          color: #ffffff;
        }


        .client-edit-cancel:disabled,
        .client-edit-save:disabled {
          opacity: 0.55;

          cursor: default;
        }


        /* =====================================
           DEVIS FINAL
        ===================================== */

        .my-quote-view {
          width: 100%;

          max-width: 810px;

          margin: 0 auto;

          padding: 10px 6px 35px;
        }


        .my-quote-wrapper {
          width: 100%;

          max-width: 794px;

          margin: 0 auto;

          overflow: hidden;
        }


        .my-quote-scaled-area {
          position: relative;

          margin: 0 auto;

          overflow: hidden;

          background: #ffffff;

          box-shadow:
            0 4px 18px
            rgba(15, 23, 42, 0.12);
        }


        .my-quote-scale {
          position: absolute;

          top: 0;

          left: 0;

          background: #ffffff;
        }


        /* =====================================
           ENREGISTRER / IMPRIMER
        ===================================== */

        .my-quote-actions {
          width: 100%;

          max-width: 794px;

          margin: 14px auto 0;

          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 9px;
        }


        .my-quote-actions button {
          min-height: 49px;

          padding: 8px;

          border-radius: 10px;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 7px;

          font-family: inherit;

          font-size: 11px;

          font-weight: 900;

          cursor: pointer;
        }


        .save-quote-button {
          border: none;

          background: #174b91;

          color: #ffffff;
        }


        .print-quote-button {
          border: 2px solid #174b91;

          background: #ffffff;

          color: #174b91;
        }


        .save-quote-button:disabled {
          opacity: 0.6;

          cursor: default;
        }


        .quote-action-icon {
          font-size: 17px;
        }


        /* =====================================
           BARRE DES TÂCHES FIXE EN BAS
        ===================================== */

        .bottom-nav {
          position: fixed;

          left: 50%;

          bottom: 0;

          transform: translateX(-50%);

          width: 100%;

          max-width: 760px;

          height: 66px;

          padding: 4px 5px;

          display: grid;

          grid-template-columns:
            repeat(5, 1fr);

          align-items: center;

          background: #ffffff;

          border-top: 1px solid #e2e7ed;

          box-shadow:
            0 -3px 14px
            rgba(15, 23, 42, 0.08);

          z-index: 9999;
        }


        .bottom-nav-item {
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


        .bottom-nav-icon {
          min-height: 25px;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 20px;

          line-height: 1;
        }


        .bottom-nav-item.active {
          color: #174b91;

          font-weight: 900;
        }


        .live-nav-icon {
          width: 25px;

          height: 25px;

          min-height: 25px;

          border-radius: 50%;

          background: #174b91;

          color: #ffffff;

          font-size: 9px;
        }


        /* =====================================
           TÉLÉPHONE
        ===================================== */

        @media (max-width: 560px) {

          .my-quotes-page {
            padding-bottom: 70px;
          }


          .my-quotes-header {
            min-height: 67px;

            padding: 9px 8px;

            gap: 6px;

            position: sticky;

            top: 0;

            z-index: 9998;

            background: #ffffff;
          }


          .my-quotes-back {
            width: 35px;

            height: 35px;

            font-size: 24px;
          }


          .my-quotes-header-text h1 {
            font-size: 17px;
          }


          .my-quotes-header-text p {
            font-size: 8px;
          }


          .my-quotes-content {
            padding: 10px 7px 25px;
          }


          .my-quote-card {
            padding: 11px 9px;

            gap: 8px;
          }


          .my-quote-card-icon {
            width: 39px;

            height: 39px;

            font-size: 18px;
          }


          .my-quote-card-top strong {
            font-size: 10px;
          }


          .my-quote-card-subject {
            font-size: 9px;
          }


          .my-quote-card-bottom {
            font-size: 7px;
          }


          /* DEMANDE */

          .quote-waiting-wrapper {
            padding: 13px 7px 25px;
          }


          .quote-waiting-card {
            padding: 20px 11px;
          }


          .quote-waiting-card h2 {
            font-size: 16px;
          }


          .quote-waiting-text {
            font-size: 10px;
          }


          .client-request-summary {
            padding: 12px 10px;
          }


          .client-request-summary-row {
            font-size: 9px;
          }


          .waiting-actions {
            grid-template-columns: 1fr;
          }


          .edit-request-button,
          .waiting-back-button {
            width: 100%;

            min-height: 45px;
          }


          /* MODIFICATION */

          .client-edit-quote-wrapper {
            padding: 11px 7px 25px;
          }


          .client-edit-quote-card {
            padding: 14px 10px;
          }


          .client-edit-form {
            grid-template-columns: 1fr;

            gap: 12px;
          }


          .client-edit-field-full {
            grid-column: auto;
          }


          .client-edit-actions {
            grid-column: auto;

            grid-template-columns: 1fr;
          }


          .client-edit-save {
            order: 1;
          }


          .client-edit-cancel {
            order: 2;
          }


          /* DEVIS */

          .my-quote-view {
            padding: 6px 4px 25px;

            overflow: hidden;
          }


          .my-quote-wrapper {
            width: 100%;

            max-width: 100%;

            overflow: hidden;
          }


          /* BARRE DES TÂCHES */

          .bottom-nav {
            width: 100%;

            max-width: none;

            height: 64px;

            padding: 3px 2px;
          }


          .bottom-nav-item {
            height: 56px;

            padding: 2px 1px;

            gap: 2px;

            font-size: 7px;
          }


          .bottom-nav-icon {
            min-height: 24px;

            font-size: 19px;
          }


          .live-nav-icon {
            width: 24px;

            height: 24px;

            min-height: 24px;

            font-size: 8px;
          }

        }


        /* =====================================
           IMPRESSION
        ===================================== */

        @media print {

  @page {
    size: A4 portrait;
    margin: 0;
  }

  html,
  body {
    width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }

  body {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  #root {
    width: 210mm !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body * {
    visibility: hidden !important;
  }

  #umi-quote-document,
  #umi-quote-document * {
    visibility: visible !important;

    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .no-print,
  .bottom-nav,
  .my-quotes-header,
  .my-quote-actions {
    display: none !important;
  }

  .my-quotes-page,
  .my-quote-view,
  .my-quote-wrapper,
  .my-quote-scaled-area,
  .my-quote-scale {
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: visible !important;

    transform: none !important;

    box-shadow: none !important;
  }

  #umi-quote-document {
    position: absolute !important;

    top: 0 !important;
    left: 0 !important;

    width: 210mm !important;

    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: visible !important;

    transform: none !important;

    background: #ffffff !important;
  }

  .umi-quote-page {
    position: relative !important;

    width: 210mm !important;

    /*
     * IMPORTANT :
     * un peu moins que 297 mm pour éviter
     * qu'Android crée une feuille vide.
     */
    height: 296mm !important;
    min-height: 296mm !important;
    max-height: 296mm !important;

    margin: 0 !important;
    padding-top: 36px !important;
    padding-right: 46px !important;
    padding-bottom: 30px !important;
    padding-left: 46px !important;

    box-sizing: border-box !important;

    overflow: hidden !important;

    transform: none !important;

    page-break-inside: avoid !important;
    break-inside: avoid-page !important;

    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

    /* Aucun saut avant les pages, annexes comprises */
  .umi-quote-page {
    page-break-before: auto !important;
    break-before: auto !important;
  }

  /* Un seul saut entre deux pages */
  .umi-quote-page:not(:last-child) {
    page-break-after: always !important;
    break-after: page !important;
  }

  /* Aucun saut après la dernière page */
  .umi-quote-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
}
          `}
    </style>
  );
}

/* ==============================
   FIN DU COMPOSANT MYQUOTES
============================== */

}


export default MyQuotes;
