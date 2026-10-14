import HighlightUploadStatus from "./HighlightUploadStatus";
import DraggableMessageBubble from "./DraggableMessageBubble";
import { lazy } from "react";
import SellerSales from "./SellerSales";
const AdminAccounts = lazy(() => import("./AdminAccounts"));
import Privacy from "./Privacy";
import UmiModal from "./UmiModal";
import { withProductModel } from "./productModel";
import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import { useEffect, useRef, useState } from "react";
import Splash from "./Splash";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { signOut } from "firebase/auth";
import { createPortal } from "react-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "./firebase";

import "./App.css";

import Intro from "./Intro";
import Login from "./Login";
import Register from "./Register";

import Home from "./Home";
import Cart from "./Cart";
import Account from "./Account";
import Favorites from "./Favorites";
import Order from "./Order";
import Payment from "./Payment";
import MyOrders from "./MyOrders";
import OrderDetail from "./OrderDetail";
import MyQuotes from "./MyQuotes";
const UmiLive = lazy(() => import("./UmiLive"));
const CreateClientLive = lazy(() => import("./CreateClientLive"));
const MyClientLives = lazy(() => import("./MyClientLives"));

import AdminDashboard from "./AdminDashboard";
const AdminOrders = lazy(() => import("./AdminOrders"));
const AdminMachines = lazy(() => import("./AdminMachines"));
const AdminReviews = lazy(() => import("./AdminReviews"));
import AdminLive from "./AdminLive";
const AdminReplays = lazy(() => import("./AdminReplays"));
const CreateLive = lazy(() => import("./CreateLive"));
const ScheduleLive = lazy(() => import("./ScheduleLive"));

const AddMachine = lazy(() => import("./AddMachine"));
const EditMachine = lazy(() => import("./EditMachine"));
import Machines from "./Machines";

import Categories from "./Categories.jsx";
import MachineCategory from "./MachineCategory";
import ProductDetail from "./ProductDetail";
import ProductReviews from "./ProductReviews";

import RawMaterials from "./RawMaterials";
import Packaging from "./Packaging";
import CommerceProductDetail from "./CommerceProductDetail";
import QuoteRequest from "./QuoteRequest";
import ClientChat from "./ClientChat";

const AdminRawMaterials = lazy(() => import("./AdminRawMaterials"));
const AdminRawMaterialsList = lazy(() => import("./AdminRawMaterialsList"));

const AdminPackaging = lazy(() => import("./AdminPackaging"));
const AdminPackagingList = lazy(() => import("./AdminPackagingList"));

const AdminQuotes = lazy(() => import("./AdminQuotes"));
import AdminChat from "./AdminChat";
import AdminChatBubble from "./AdminChatBubble";

const AdminHomeMedia = lazy(() => import("./AdminHomeMedia"));
import AdminFloatingNotifications
  from "./AdminFloatingNotifications";

function AppContent({
  currentUser,
  onUserChanged,
  adminNewQuotesCount = 0,
  adminUnreadChatsCount = 0,
}) {
  const [showMessageWindow, setShowMessageWindow] = useState(false);
  const [showQuoteWindow, setShowQuoteWindow] = useState(false);
  const [liveOrderProduct, setLiveOrderProduct] = useState(null);
const [livePaymentItems, setLivePaymentItems] = useState(null);
const [liveCheckoutStep, setLiveCheckoutStep] = useState("order");
    /* =========================================
     NOTIFICATIONS CLIENT
  ========================================= */

  const [
    clientUnreadQuotesCount,
    setClientUnreadQuotesCount,
  ] = useState(0);

  const [
    clientUnreadChatsCount,
    setClientUnreadChatsCount,
  ] = useState(0);
  const [showLiveCart, setShowLiveCart] = useState(false);
    /* =========================================
     NOTIFICATIONS PUSH ANDROID
  ========================================= */
useEffect(() => {

  let registrationListener = null;
  let registrationErrorListener = null;
  let authListener = null;

  let currentPushToken = null;


  /* =========================================
     ENREGISTRER LE TOKEN DANS FIRESTORE
  ========================================= */

  const savePushToken = async (
    tokenValue,
    user
  ) => {

    if (!tokenValue || !user?.uid) {
      return;
    }

    try {

      await setDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {
          fcmToken: tokenValue,
          fcmTokenUpdatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      console.log(
        "✅ TOKEN PUSH ENREGISTRÉ DANS FIRESTORE"
      );

    } catch (error) {

      console.error(
        "❌ Erreur enregistrement token Firestore :",
        error
      );

    }

  };


  /* =========================================
     CONFIGURER LES NOTIFICATIONS
  ========================================= */

  const setupPushNotifications =
    async () => {

      if (!Capacitor.isNativePlatform()) {

        console.log(
          "Notifications push : mode navigateur"
        );

        return;

      }

      try {

        /* TOKEN FCM */

        registrationListener =
          await PushNotifications.addListener(
            "registration",
            async (token) => {

              currentPushToken =
                token.value;

              console.log(
                "✅ TOKEN PUSH UMI :",
                token.value
              );


              /*
               * Si l'utilisateur est déjà
               * connecté, enregistrer immédiatement
               */

              if (auth.currentUser) {

                await savePushToken(
                  token.value,
                  auth.currentUser
                );

              }

            }
          );


        /* ERREUR FCM */

        registrationErrorListener =
          await PushNotifications.addListener(
            "registrationError",
            (error) => {

              console.error(
                "❌ ERREUR TOKEN PUSH UMI :",
                error
              );

            }
          );


        /*
         * SURVEILLER LA CONNEXION FIREBASE
         *
         * Si le token arrive avant que
         * l'utilisateur soit connecté,
         * il sera enregistré dès que
         * Firebase Auth trouve l'utilisateur.
         */

        authListener =
          auth.onAuthStateChanged(
            async (user) => {

              if (
                user &&
                currentPushToken
              ) {

                await savePushToken(
                  currentPushToken,
                  user
                );

              }

            }
          );


        /* AUTORISATION */

        let permission =
          await PushNotifications
            .checkPermissions();


        if (
          permission.receive ===
          "prompt"
        ) {

          permission =
            await PushNotifications
              .requestPermissions();

        }


        if (
          permission.receive !==
          "granted"
        ) {

          console.log(
            "❌ Notifications non autorisées."
          );

          return;

        }


        /* ENREGISTREMENT FCM */

        await PushNotifications.register();

        console.log(
          "✅ Enregistrement notifications demandé."
        );


      } catch (error) {

        console.error(
          "❌ Erreur configuration notifications :",
          error
        );

      }

    };


  setupPushNotifications();


  /* =========================================
     NETTOYAGE
  ========================================= */

  return () => {

    if (registrationListener) {
      registrationListener.remove();
    }

    if (registrationErrorListener) {
      registrationErrorListener.remove();
    }

    if (authListener) {
      authListener();
    }

  };

}, []);
  /* =========================================
     PHOTO DU COMPTE
  ========================================= */

  const [userPhoto, setUserPhoto] =
    useState("");

  useEffect(() => {

    let active = true;

    const loadUserPhoto = async () => {

      let savedUser = null;

      try {

        savedUser = JSON.parse(
          localStorage.getItem("umiCurrentUser") ||
            "null"
        );

      } catch (error) {

        console.error(
          "Erreur utilisateur local :",
          error
        );

      }

      const localPhoto =
        currentUser?.photoURL ||
        savedUser?.photoURL ||
        auth.currentUser?.photoURL ||
        "";

      if (active) {
        setUserPhoto(localPhoto);
      }

      const userId = auth.currentUser?.uid;
console.log(
  "🔥 UID AU MOMENT DU TOKEN :",
  userId
);
      if (!userId) {
        return;
      }

      try {

        const snapshot =
          await getDoc(
            doc(db, "users", userId)
          );

        if (!snapshot.exists()) {
          return;
        }

        const data =
          snapshot.data();

        const photo =
          data?.photoURL ||
          localPhoto ||
          "";

        if (active) {
          setUserPhoto(photo);
        }

      } catch (error) {

        console.error(
          "Erreur chargement photo :",
          error
        );

      }

    };

    loadUserPhoto();

    return () => {
      active = false;
    };

  }, [currentUser]);
  /* =========================================
     PAGE
  ========================================= */

  const [page, setPage] = useState(() => {

  const splashSeen =
    sessionStorage.getItem(
      "umiSplashSeen"
    );

  if (!splashSeen) {
    return "splash";
  }

  const savedPage =
    sessionStorage.getItem(
      "umiCurrentPage"
    );

  return savedPage || "intro";

});
  const [spectatorPreview, setSpectatorPreview] = useState(() => {
  try {
    const saved = sessionStorage.getItem("umiSpectatorPreview");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
});
const [selectedOrder, setSelectedOrder] =
  useState(null);
  const [buyerInfo, setBuyerInfo] =
  useState(null);

  /* =========================================
     HISTORIQUE
  ========================================= */

  const pageHistoryRef =
    useRef([]);

  const pageRef =
    useRef(page);


  useEffect(() => {

    pageRef.current = page;

  }, [page]);


  useEffect(() => {

    try {

      const savedHistory =
        sessionStorage.getItem(
          "umiPageHistory"
        );

      if (savedHistory) {

        const parsedHistory =
          JSON.parse(savedHistory);

        if (
          Array.isArray(
            parsedHistory
          )
        ) {

          pageHistoryRef.current =
            parsedHistory;

        }

      }

    } catch (error) {

      console.error(
        "Erreur historique navigation :",
        error
      );

      pageHistoryRef.current = [];

    }

  }, []);


  const saveHistory = () => {

    sessionStorage.setItem(
      "umiPageHistory",
      JSON.stringify(
        pageHistoryRef.current
      )
    );

  };

/* =========================================
   COMPTEURS CLIENT EN TEMPS RÉEL
========================================= */

useEffect(() => {

  const userId =
    currentUser?.userId ||
    currentUser?.uid ||
    auth.currentUser?.uid ||
    "";

  if (!userId) {

    setClientUnreadQuotesCount(0);
    setClientUnreadChatsCount(0);

    return;

  }


  /* =====================================
     DEVIS DU CLIENT
  ===================================== */

  const quotesQuery =
    query(
      collection(
        db,
        "quotes"
      ),
      where(
        "userId",
        "==",
        userId
      )
    );


  const unsubscribeQuotes =
    onSnapshot(
      quotesQuery,

      (snapshot) => {

        const unreadQuotes =
          snapshot.docs.filter(
            (document) => {

              const data =
                document.data();

             return (
  data.clientSeen !== true &&
  (
    data.status === "Devis envoyé" ||
    data.status === "Traité" ||
    data.status === "traité" ||
    data.status === "Répondu" ||
    data.status === "répondu" ||
    data.adminResponse ||
    data.adminUpdatedAt
  )
);

            }
          );

        setClientUnreadQuotesCount(
          unreadQuotes.length
        );

      },

      (error) => {

        console.error(
          "Erreur compteur devis client :",
          error
        );

        setClientUnreadQuotesCount(0);

      }
    );


  /* =====================================
     CHAT DU CLIENT
  ===================================== */

  const conversationRef =
    doc(
      db,
      "conversations",
      userId
    );


  const unsubscribeChat =
    onSnapshot(
      conversationRef,

      (snapshot) => {

        if (!snapshot.exists()) {

          setClientUnreadChatsCount(0);

          return;

        }

        const data =
          snapshot.data();

        const unreadCount =
  Number(
    data.unreadClientCount ??
    (
      data.unreadClient === true
        ? 1
        : 0
    )
  );

setClientUnreadChatsCount(
  Number.isFinite(unreadCount)
    ? unreadCount
    : 0
);

      },

      (error) => {

        console.error(
          "Erreur compteur chat client :",
          error
        );

        setClientUnreadChatsCount(0);

      }
    );


  return () => {

    unsubscribeQuotes();
    unsubscribeChat();

  };

}, [currentUser]);
  /* =========================================
     NAVIGATION
  ========================================= */

  const navigateTo = (
    newPage
  ) => {

    if (!newPage) {
      return;
    }


    const currentPage =
      pageRef.current;


    if (
      newPage === currentPage
    ) {
      return;
    }


    pageHistoryRef.current.push(
      currentPage
    );


    saveHistory();


    pageRef.current =
      newPage;


    setPage(
      newPage
    );

  };


  const goBack = () => {

    const history = [
      ...pageHistoryRef.current,
    ];


    let previousPage =
      null;


    while (
      history.length > 0 &&
      !previousPage
    ) {

      const candidate =
        history.pop();


      if (
        candidate &&
        candidate !==
          pageRef.current
      ) {

        previousPage =
          candidate;

      }

    }


    pageHistoryRef.current =
      history;


    saveHistory();


    if (!previousPage) {

      pageRef.current =
        "home";

      setPage(
        "home"
      );

      return;

    }


    pageRef.current =
      previousPage;


    setPage(
      previousPage
    );

  };
/* =========================================
   BULLES FLOTTANTES ADMIN
========================================= */

const renderAdminNotifications = () => {
  if (
    page === "home" ||
    page === "adminDashboard" ||
    page === "intro" ||
    page === "splash" ||
    page === "adminChat" ||
    page === "clientChat"
  ) {
    return null;
  }

  return (
    <AdminFloatingNotifications
      quoteCount={adminNewQuotesCount}
      chatCount={adminUnreadChatsCount}

      onOpenQuotes={() => {
        setShowQuoteWindow(true);
      }}

      onOpenChat={() => {
        setShowMessageWindow(true);
      }}
    />
  );
};
/* =========================================
   RETOUR SYSTÈME ANDROID
========================================= */

useEffect(() => {

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  let backButtonListener = null;

  const setupAndroidBackButton = async () => {

    backButtonListener =
      await CapacitorApp.addListener(
        "backButton",
        () => {

          const currentPage =
            pageRef.current;

          /*
            Sur l'accueil :
            on reste dans UMI.
            Le geste Retour Android
            ne ferme pas l'application.
          */

          if (
            currentPage === "home"
          ) {
            return;
          }

          /*
            Splash / Intro :
            retour vers l'accueil.
          */

          if (
            currentPage === "splash" ||
            currentPage === "intro"
          ) {

            pageHistoryRef.current = [];

            saveHistory();

            pageRef.current = "home";

            setPage("home");

            return;
          }

          /*
            Matières premières publiées /
            Emballages publiés :
            même comportement que la flèche
            de retour de ces pages.
          */

          if (
            currentPage === "adminRawMaterialsList" ||
            currentPage === "adminPackagingList"
          ) {

            setSelectedProduct(
              null
            );

            navigateTo(
              "adminDashboard"
            );

            return;
          }

          /*
            Toutes les autres pages :
            retour à la page précédente UMI.
          */

          goBack();

        }
      );

  };

  setupAndroidBackButton();

  return () => {

    if (backButtonListener) {
      backButtonListener.remove();
    }

  };

}, []);
  const goToHome = () => {

    setSelectedCategory(
      null
    );

    navigateTo(
      "home"
    );

  };


  /* =========================================
     ÉTATS
  ========================================= */

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);


  const [
    selectedCommerceType,
    setSelectedCommerceType,
  ] = useState(null);


  const [
    pageBeforeQuote,
    setPageBeforeQuote,
  ] = useState("home");


  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState(null);


  const [
    machines,
    setMachines,
  ] = useState([]);


  const [
    cart,
    setCart,
  ] = useState([]);


  const [
    orders,
    setOrders,
  ] = useState([]);
  /* =========================================================
   RETOUR APRÈS PAIEMENT PAYDUNYA
========================================================= */

/* =========================================================
   RETOUR APRÈS PAIEMENT PAYDUNYA
========================================================= */

useEffect(() => {

  const verifyPayDunyaPayment =
    async () => {

      const params =
        new URLSearchParams(
          window.location.search
        );

      const payment =
        params.get("payment");

      const refCommand =
        params.get("refCommand");

      if (
        payment !== "success" ||
        !refCommand
      ) {
        return;
      }

      try {

        console.log(
          "🔎 Vérification paiement PayDunya :",
          refCommand
        );

        const response =
  await fetch(
    `https://audit-work-bios-durable.trycloudflare.com/api/payments/paydunya/status/${encodeURIComponent(
      refCommand
    )}`
  );

        const result =
          await response.json();

        console.log(
          "💳 Résultat vérification PayDunya :",
          result
        );

        if (
          response.ok &&
          result?.success === true &&
          result?.paid === true
        ) {

          console.log(
            "✅ Paiement PayDunya confirmé dans UMI"
          );

          setCart([]);

          localStorage.removeItem(
            "umiCart"
          );

          sessionStorage.removeItem(
            "umiCart"
          );

          setPage("myOrders");

          sessionStorage.setItem(
            "umiCurrentPage",
            "myOrders"
          );

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

        } else {

          console.log(
            "⏳ Paiement PayDunya pas encore confirmé."
          );

        }

      } catch (error) {

        console.error(
          "❌ Erreur vérification paiement PayDunya :",
          error
        );

      }

    };

  verifyPayDunyaPayment();

}, []);


  /* =========================================
     FAVORIS
  ========================================= */

 const [
  favorites,
  setFavorites,
] = useState([]);

useEffect(() => {
  const userId = auth.currentUser?.uid;

  if (!userId) return;

  const machineFavorites = favorites.filter(
    (favorite) =>
      !favorite.productType ||
      favorite.productType === "machine"
  );

  const unsubscribers = machineFavorites.map(
    (favorite) => {
      const machineId =
        favorite.originalId || favorite.id;

      const favoriteKey = favorite.favoriteKey;

      if (!machineId || !favoriteKey) {
        return () => {};
      }

      return onSnapshot(
        doc(db, "machines", machineId),

        (snapshot) => {
          if (snapshot.exists()) return;

          setFavorites((current) =>
            current.filter(
              (item) =>
                item.favoriteKey !== favoriteKey
            )
          );

          deleteDoc(
            doc(
              db,
              "users",
              userId,
              "favorites",
              favoriteKey
            )
          ).catch((error) => {
            console.error(
              "Erreur suppression du favori :",
              error
            );
          });
        },

        (error) => {
          console.error(
            "Erreur vérification machine favorite :",
            error
          );
        }
      );
    }
  );

  return () => {
    unsubscribers.forEach(
      (unsubscribe) => unsubscribe()
    );
  };
}, [favorites]);


  const [
    pageBeforeCart,
    setPageBeforeCart,
  ] = useState("home");


  const [
    showAccountPopup,
    setShowAccountPopup,
  ] = useState(false);
  const [showInlineLogin, setShowInlineLogin] = useState(false);
/* =========================================
   FENÊTRE DEVIS
========================================= */

const [
  showQuotePopup,
  setShowQuotePopup,
] = useState(false);

  const [
    pageAfterLogin,
    setPageAfterLogin,
  ] = useState(null);


  /* =========================================
     MÉMORISER PAGE
  ========================================= */

  useEffect(() => {

    sessionStorage.setItem(
      "umiCurrentPage",
      page
    );

  }, [page]);


  /* =========================================
     MACHINES FIRESTORE
  ========================================= */

  useEffect(() => {

    const machinesRef =
      collection(
        db,
        "machines"
      );


    const unsubscribe =
      onSnapshot(

        machinesRef,

        (querySnapshot) => {

          const machinesData =
            querySnapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );


          setMachines(machinesData.map(withProductModel));


          setSelectedProduct(
            (currentProduct) => {

              if (
                !currentProduct?.id
              ) {

                return currentProduct;

              }


              const refreshedMachine =
                machinesData.find(
                  (machine) =>
                    machine.id ===
                    currentProduct.id
                );


              if (
                !refreshedMachine
              ) {

                return currentProduct;

              }


              return {
                ...currentProduct,
                ...refreshedMachine,
              };

            }
          );

        },

        (error) => {

          console.error(
            "Erreur chargement machines :",
            error
          );

        }

      );


    return () => {

      unsubscribe();

    };

  }, []);


  /* =========================================
     UTILISATEUR
  ========================================= */

  const getCurrentUser = () => {

    try {

      const savedUser =
        localStorage.getItem(
          "umiCurrentUser"
        );


      if (!savedUser) {

        return null;

      }


      return JSON.parse(
        savedUser
      );


    } catch (error) {

      console.error(
        "Erreur lecture utilisateur :",
        error
      );


      return null;

    }

  };


  /* =========================================
     FAVORIS - CLÉ UNIQUE
  ========================================= */

  const getFavoriteKey = (
    product,
    productType = null
  ) => {

    if (!product) {
      return null;
    }


    const type =
      productType ||
      product.productType ||
      "machine";


    const originalId =
      product.originalId ||
      product.id;


    if (!originalId) {
      return null;
    }


    return `${type}_${originalId}`;

  };


  /* =========================================
     CHARGER LES FAVORIS
  ========================================= */

  const loadUserFavorites = async () => {

  const firebaseUser = auth.currentUser;

  // Firebase Auth doit être réellement connecté
  if (!firebaseUser?.uid) {
    setFavorites([]);
    return [];
  }

  const userId = firebaseUser.uid;

  try {

    const favoritesRef = collection(
      db,
      "users",
      userId,
      "favorites"
    );

    const snapshot = await getDocs(
      favoritesRef
    );

    const favoritesData =
      snapshot.docs.map((document) => ({
        favoriteKey: document.id,
        ...document.data(),
      }));

    favoritesData.sort((a, b) => {

      const dateA =
        a?.createdAt?.seconds || 0;

      const dateB =
        b?.createdAt?.seconds || 0;

      return dateB - dateA;

    });

    setFavorites(favoritesData);

    return favoritesData;

  } catch (error) {

    console.error(
      "Erreur chargement favoris :",
      error
    );

    setFavorites([]);

    return [];

  }

};

  /* =========================================
     CHARGER LES FAVORIS AU DÉMARRAGE
  ========================================= */

  useEffect(() => {

  if (!auth.currentUser?.uid) {
    setFavorites([]);
    return;
  }

  loadUserFavorites();

}, [currentUser]);


  /* =========================================
     SAVOIR SI ARTICLE EST FAVORI
  ========================================= */

  const isProductFavorite = (
    product,
    productType = null
  ) => {

    const favoriteKey =
      getFavoriteKey(
        product,
        productType
      );


    if (!favoriteKey) {
      return false;
    }


    return favorites.some(
      (favorite) =>
        favorite.favoriteKey ===
        favoriteKey
    );

  };


  /* =========================================
     AJOUTER / RETIRER FAVORI
  ========================================= */

  const handleToggleFavorite =
    async (
      product,
      productType = null
    ) => {

      const currentUser =
        getCurrentUser();


      if (
        !currentUser?.userId
      ) {

        setPageAfterLogin(
          pageRef.current
        );


        setShowAccountPopup(
          true
        );


        return false;

      }


      if (!product?.id) {

        return false;

      }


      const type =
        productType ||
        product.productType ||
        "machine";


      const originalId =
        product.originalId ||
        product.id;


      const favoriteKey =
        `${type}_${originalId}`;


      const favoriteReference =
        doc(
          db,
          "users",
          currentUser.userId,
          "favorites",
          favoriteKey
        );


      const alreadyFavorite =
        favorites.some(
          (favorite) =>
            favorite.favoriteKey ===
            favoriteKey
        );


      try {

        if (alreadyFavorite) {

          await deleteDoc(
            favoriteReference
          );


          setFavorites(
            (previousFavorites) =>
              previousFavorites.filter(
                (favorite) =>
                  favorite.favoriteKey !==
                  favoriteKey
              )
          );


          return false;

        }


        const favoriteData = {

          ...product,

          id:
            originalId,

          originalId,

          productType:
            type,

          favoriteKey,

          createdAt:
            serverTimestamp(),

        };


        /*
          On ne sauvegarde pas une quantité
          de panier dans les favoris.
        */

        delete favoriteData.quantity;


        await setDoc(
          favoriteReference,
          favoriteData
        );


        setFavorites(
          (previousFavorites) => [

            {
              ...favoriteData,

              createdAt:
                new Date(),
            },

            ...previousFavorites,

          ]
        );


        return true;


      } catch (error) {

        console.error(
          "Erreur modification favori :",
          error
        );


        await umiNotify(
          "Impossible de modifier les favoris pour le moment."
        );


        return alreadyFavorite;

      }

    };


  /* =========================================
     RETIRER DEPUIS PAGE FAVORIS
  ========================================= */

  const handleRemoveFavorite =
    async (product) => {

      if (!product) {
        return;
      }


      await handleToggleFavorite(
        product,
        product.productType ||
          "machine"
      );

    };


  /* =========================================
     OUVRIR PAGE FAVORIS
  ========================================= */

  const handleOpenFavorites =
    async () => {

      const currentUser =
        getCurrentUser();


      if (!currentUser) {

        setPageAfterLogin(
          "favorites"
        );


        setShowAccountPopup(
          true
        );


        return;

      }


      await loadUserFavorites();


      navigateTo(
        "favorites"
      );

    };


  /* =========================================
     OUVRIR PRODUIT DEPUIS FAVORIS
  ========================================= */

  const handleOpenFavoriteProduct =
    (favorite) => {

      if (!favorite) {
        return;
      }


      if (
        favorite.productType ===
          "rawMaterial" ||
        favorite.productType ===
          "packaging"
      ) {

        setSelectedProduct(
          favorite
        );


        setSelectedCommerceType(
          favorite.productType
        );


        navigateTo(
          "commerceProduct"
        );


        return;

      }


      const freshMachine =
        machines.find(
          (machine) =>
            machine.id ===
            (
              favorite.originalId ||
              favorite.id
            )
        );


      setSelectedProduct(
        freshMachine ||
        favorite
      );


      navigateTo(
        "product"
      );

    };


  /* =========================================
     DEMANDER CONNEXION
  ========================================= */

  const requireLogin = (
    destinationPage
  ) => {

    const currentUser =
      getCurrentUser();


    if (currentUser) {

      navigateTo(
        destinationPage
      );


      return true;

    }


    setPageAfterLogin(
      destinationPage
    );


    setShowAccountPopup(
      true
    );


    return false;

  };


  /* =========================================
     RETOUR APRÈS CONNEXION
  ========================================= */

  const goToPageAfterLogin =
    () => {

      if (pageAfterLogin) {

        const destination =
          pageAfterLogin;


        setPageAfterLogin(
          null
        );


        setShowAccountPopup(
          false
        );


        if (
          destination ===
          "favorites"
        ) {

          loadUserFavorites();

        }


        navigateTo(
          destination
        );


        return true;

      }


      return false;

    };


  /* =========================================
     PANIER
  ========================================= */

  const getCartStorageKey = (
    user
  ) => {

    if (!user?.userId) {
      return null;
    }


    return `umiCart_${user.userId}`;

  };


  const normalizeCart = (cartData) => {
  if (!Array.isArray(cartData)) {
    return [];
  }

  return cartData
    .filter((item) => item && item.id)
    .map((item) => {
      const quantity = Number(item.quantity);

      return {
        ...item,
        quantity: Number.isFinite(quantity)
          ? Math.max(1, Math.floor(quantity))
          : 1,
      };
    });
};
  const loadUserCart = () => {

    const currentUser =
      getCurrentUser();


    if (!currentUser) {

      setCart([]);

      return;

    }


    const cartKey =
      getCartStorageKey(
        currentUser
      );


    if (!cartKey) {

      setCart([]);

      return;

    }


    try {

      const savedCart =
        localStorage.getItem(
          cartKey
        );


      if (!savedCart) {

        setCart([]);

        return;

      }


      const normalizedCart =
        normalizeCart(
          JSON.parse(
            savedCart
          )
        );


      setCart(
        normalizedCart
      );


      localStorage.setItem(
        cartKey,
        JSON.stringify(
          normalizedCart
        )
      );


    } catch (error) {

      console.error(
        "Erreur chargement panier :",
        error
      );


      setCart([]);

    }

  };


  useEffect(() => {

    loadUserCart();

  }, []);


  const saveCartForUser = (
    newCart,
    user = getCurrentUser()
  ) => {

    if (!user) {
      return;
    }


    const cartKey =
      getCartStorageKey(
        user
      );


    if (!cartKey) {
      return;
    }


    try {

      localStorage.setItem(
        cartKey,
        JSON.stringify(
          newCart
        )
      );


    } catch (error) {

      console.error(
        "Erreur sauvegarde panier :",
        error
      );

    }

  };


  /* =========================================
     COMMANDES
  ========================================= */

  const loadUserOrders =
    async () => {

      const currentUser =
        getCurrentUser();


      if (
        !currentUser?.userId
      ) {

        setOrders([]);

        return;

      }


      try {

        const ordersQuery =
          query(

            collection(
              db,
              "orders"
            ),

            where(
              "userId",
              "==",
              currentUser.userId
            )

          );


        const querySnapshot =
          await getDocs(
            ordersQuery
          );


        const ordersData =
          querySnapshot.docs.map(
            (document) => ({

              id:
                document.id,

              ...document.data(),

            })
          );


        setOrders(
          ordersData
        );


      } catch (error) {

        console.error(
          "Erreur commandes :",
          error
        );


        setOrders([]);

      }

    };

/* =========================================
   FENÊTRE DEVIS
========================================= */

const renderQuotePopup = () => {

  if (!showQuotePopup) {
    return null;
  }

  return (

    <div
      onClick={() =>
        setShowQuotePopup(false)
      }
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >

      <div
        onClick={(event) =>
          event.stopPropagation()
        }
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "380px",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "55px 20px 22px",
          boxSizing: "border-box",
          boxShadow:
            "0 15px 45px rgba(0,0,0,0.22)",
        }}
      >

        {/* FERMER */}

        <button
          type="button"
          onClick={() =>
            setShowQuotePopup(false)
          }
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "36px",
            height: "36px",
            border: "none",
            borderRadius: "50%",
            background: "#f1f4f8",
            fontSize: "22px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          ×
        </button>


        {/* NOUVEAU DEVIS */}

<button
  type="button"
  onClick={() => {
  setShowQuotePopup(false);
  setSelectedProduct(null);
  navigateTo("quote");
}}
  style={{
    width: "100%",
    height: "58px",
    border: "none",
    borderRadius: "14px",
    background: "#174b91",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    marginBottom: "12px",
  }}
>
  📄 Nouveau devis
</button>


        {/* MES DEVIS */}

        <button
  type="button"
  onClick={() => {
    setShowQuotePopup(false);
    navigateTo("myQuotes");
  }}
  style={{
    width: "100%",
    height: "58px",
    border: "none",
    borderRadius: "14px",
    background: "#174b91",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  }}
>
  <span>📋 Mes devis</span>

  {clientUnreadQuotesCount > 0 && (
    <span
      style={{
        minWidth: "24px",
        height: "24px",
        padding: "0 6px",
        borderRadius: "999px",
        background: "#e11d48",
        color: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        fontSize: "12px",
        fontWeight: "800",
      }}
    >
      {clientUnreadQuotesCount > 99
        ? "99+"
        : clientUnreadQuotesCount}
    </span>
  )}
</button>
      </div>

    </div>

  );
};
  /* =========================================
     POPUP CONNEXION
  ========================================= */

  const renderAccountPopup =
    () => {

      if (showInlineLogin) {
        const closeLogin = () => setShowInlineLogin(false);
        const finishLogin = () => {
          onUserChanged?.();
          loadUserCart();
          loadUserFavorites();
          setShowInlineLogin(false);
          setShowAccountPopup(false);
          setPageAfterLogin(null);
          sessionStorage.removeItem("umiPageAfterLogin");
        };
        return createPortal(
          <div className="umi-inline-login-overlay" style={{ position: "fixed", inset: 0, zIndex: 2147483647, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={(event) => { if (event.target === event.currentTarget) closeLogin(); }}>
            <style>{`
              .umi-inline-login-window { width: 100%; max-width: 430px; max-height: 90dvh; overflow-y: auto; border-radius: 22px; background: #fff; color: #163a5c; }
              .umi-inline-login-window .login-page { min-height: 0 !important; height: auto !important; padding: 20px 16px !important; overflow: visible !important; align-items: center !important; background: #edf7ff !important; }
              .umi-inline-login-window .login-container { margin-top: 30px !important; }
              .umi-inline-login-window .login-logo { width: 65px; height: 50px; }
              .umi-inline-login-window .login-umi { font-size: 32px; }
              .umi-inline-login-window .login-company { margin-bottom: 14px; }
              .umi-inline-login-window .login-card { padding: 18px; }
              .umi-inline-login-window .back-button { top: 10px; left: 10px; }
              .umi-inline-login-window .create-text { display: none; }
            `}</style>
            <div className="umi-inline-login-window" role="dialog" aria-modal="true" aria-label="Se connecter à UMI">
              <Login onBack={closeLogin} onLoginSuccess={finishLogin} onAdminLoginSuccess={finishLogin} />
            </div>
          </div>,
          document.body
        );
      }
      if (!showAccountPopup) {
        return null;
      }


      return (

        <div className="account-popup-overlay">

          <div className="account-popup">

            <div className="account-popup-icon">
              🔒
            </div>


            <h2>
              Connexion nécessaire
            </h2>


            <p>
              Vous devez vous connecter
              ou créer un compte avant
              d'accéder à cette fonctionnalité.
            </p>


            <button
              type="button"
              className="account-popup-login"
              onClick={() => {
                setShowAccountPopup(false);
                setShowInlineLogin(true);
              }}
            >
              Se connecter
            </button>


            <button
              type="button"
              className="account-popup-register"
              onClick={() => {

                setShowAccountPopup(
                  false
                );

                navigateTo(
                  "register"
                );

              }}
            >
              Créer un compte
            </button>


            <button
              type="button"
              className="account-popup-continue"
              onClick={() => {

                setShowAccountPopup(
                  false
                );

                setPageAfterLogin(
                  null
                );

              }}
            >
              Continuer à explorer
            </button>

          </div>

        </div>

      );

    };


  /* =========================================
     COMPTE
  ========================================= */

  const handleOpenAccount = () => {

    const currentUser =
      getCurrentUser();


    if (!currentUser) {

      setPageAfterLogin(
        "account"
      );


      setShowAccountPopup(
        true
      );


      return;

    }


    navigateTo(
      "account"
    );

  };


  /* =========================================
     MATIÈRES PREMIÈRES
  ========================================= */

  const handleOpenRawMaterials =
    () => {

      setSelectedCommerceType(
        "rawMaterial"
      );


      navigateTo(
        "rawMaterials"
      );

    };


  /* =========================================
     EMBALLAGES
  ========================================= */

  const handleOpenPackaging =
    () => {

      setSelectedCommerceType(
        "packaging"
      );


      navigateTo(
        "packaging"
      );

    };


  /* =========================================
     CHAT
  ========================================= */

  const handleOpenChat = async () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    setPageAfterLogin("clientChat");
    setShowAccountPopup(true);
    return;
  }

  /* OUVRIR LA MESSAGERIE ADMIN */

  if (currentUser.role === "admin") {
    setShowMessageWindow(true);
    return;
  }

  /* OUVRIR L’ASSISTANCE CLIENT */

  const userId =
    currentUser?.userId ||
    currentUser?.uid ||
    auth.currentUser?.uid ||
    "";

  if (userId) {
    try {
      await setDoc(
        doc(db, "conversations", userId),
        {
          unreadClient: false,
          unreadClientCount: 0,
        },
        {
          merge: true,
        }
      );

      setClientUnreadChatsCount(0);
    } catch (error) {
      console.error(
        "Erreur lecture notification chat client :",
        error
      );
    }
  }

  setShowMessageWindow(true);
};
  /* =========================================
   DEVIS - OUVRIR LA FENÊTRE
========================================= */

const handleOpenQuote = (
  product = null
) => {

  const currentUser =
    getCurrentUser();


  setSelectedProduct(
    product || null
  );


  setPageBeforeQuote(
    pageRef.current
  );


  if (!currentUser) {

    setPageAfterLogin(
      "quote"
    );


    setShowAccountPopup(
      true
    );


    return;

  }


  /* Ouvrir la fenêtre sans quitter la page */

  setShowQuotePopup(
    true
  );

};
  /* =========================================
     OUVRIR PANIER
  ========================================= */

  const handleOpenCart = () => {

    const currentUser =
      getCurrentUser();


    setPageBeforeCart(
      pageRef.current
    );


    if (!currentUser) {

      setPageAfterLogin(
        "cart"
      );


      setShowAccountPopup(
        true
      );


      return;

    }


    loadUserCart();


    navigateTo(
      "cart"
    );

  };


  /* =========================================
     AJOUTER AU PANIER
  ========================================= */

  const handleAddToCart = (product) => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    setShowAccountPopup(true);
    return false;
  }

  if (!product?.id) {
    return false;
  }

  const cartKey = getCartStorageKey(currentUser);
  let currentUserCart = [];

  try {
    const savedCart = cartKey
      ? localStorage.getItem(cartKey)
      : null;

    if (savedCart) {
      currentUserCart = normalizeCart(JSON.parse(savedCart));
    }
  } catch (error) {
    console.error("Erreur lecture panier :", error);
  }

  const rawQuantity = Number(product.quantity);

  const requestedQuantity = Number.isFinite(rawQuantity)
    ? Math.max(1, Math.floor(rawQuantity))
    : 1;

  product = withProductModel(product);
  const modelId = product.selectedModelId || "";

const hasPrice = (value) =>
  value !== undefined &&
  value !== null &&
  String(value).trim() !== "";

const selectedModel = Array.isArray(product.models)
  ? product.models.find(
      (model) => model.id === modelId
    )
  : null;

const cartPrice = hasPrice(product.price)
  ? product.price
  : selectedModel?.price;

if (hasPrice(cartPrice)) {
  product = {
    ...product,
    price: cartPrice,
  };
}

  const existingProductIndex = currentUserCart.findIndex(
    (item) =>
      item.id === product.id &&
      (item.selectedModelId || "") === modelId
  );

  let newCart;

  if (existingProductIndex !== -1) {
    newCart = currentUserCart.map((item, index) => {
      if (index !== existingProductIndex) return item;

      return {
        ...item,
        ...product,
        selectedModelId: modelId,
        quantity:
          (Number(item.quantity) || 1) + requestedQuantity,
      };
    });
  } else {
    newCart = [
      ...currentUserCart,
      {
        ...product,
        selectedModelId: modelId,
        quantity: requestedQuantity,
      },
    ];
  }

  saveCartForUser(newCart, currentUser);
  setCart(newCart);

  return true;
};

  /* =========================================
     QUANTITÉ +
  ========================================= */
const handleIncreaseQuantity = (product) => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    setCart([]);
    setShowAccountPopup(true);
    return;
  }

  setCart((previousCart) => {
    const newCart = previousCart.map((item) => {
      const isSameModel =
        item.id === product.id &&
        (item.selectedModelId || "") ===
          (product.selectedModelId || "");

      if (!isSameModel) return item;

      return {
        ...item,
        quantity: (Number(item.quantity) || 1) + 1,
      };
    });

    saveCartForUser(newCart, currentUser);

    return newCart;
  });
};

  /* =========================================
     QUANTITÉ -
  ========================================= */

  const handleDecreaseQuantity = (product) => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    setCart([]);
    setShowAccountPopup(true);
    return;
  }

  setCart((previousCart) => {
    const newCart = previousCart.map((item) => {
      const isSameModel =
        item.id === product.id &&
        (item.selectedModelId || "") ===
          (product.selectedModelId || "");

      if (!isSameModel) return item;

      return {
        ...item,
        quantity: Math.max(
          1,
          (Number(item.quantity) || 1) - 1
        ),
      };
    });

    saveCartForUser(newCart, currentUser);

    return newCart;
  });
};

  /* =========================================
     SUPPRIMER DU PANIER
  ========================================= */
const handleRemoveFromCart = (product) => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    setCart([]);
    return;
  }

  setCart((previousCart) => {
    const newCart = previousCart.filter(
      (item) =>
        !(
          item.id === product.id &&
          (item.selectedModelId || "") ===
            (product.selectedModelId || "")
        )
    );

    saveCartForUser(newCart, currentUser);

    return newCart;
  });
};

  /* =========================================
     CONTINUER COMMANDE
  ========================================= */

  const handleContinueOrder =
    () => {
setLivePaymentItems(null);
      const currentUser =
        getCurrentUser();


      if (!currentUser) {

        setCart([]);


        setPageAfterLogin(
          "order"
        );


        setShowAccountPopup(
          true
        );


        return;

      }


      if (
        cart.length === 0
      ) {

        return;

      }


      navigateTo(
        "order"
      );

    };


  /* =========================================
     PAIEMENT
  ========================================= */

  const handleOpenPayment =
  (orderData = null) => {
setLivePaymentItems(null);
    if (orderData?.buyerInfo) {
      setBuyerInfo(orderData.buyerInfo);
    }

      const currentUser =
        getCurrentUser();


      if (!currentUser) {

        setCart([]);


        setPageAfterLogin(
          "payment"
        );


        setShowAccountPopup(
          true
        );


        return;

      }


      if (
        cart.length === 0
      ) {

        return;

      }


      navigateTo(
        "payment"
      );

    };


  const handleOrder = async (product) => {
  const added = await handleAddToCart(product);

  if (added !== true) return;

  setPageBeforeCart(pageRef.current);
  navigateTo("cart");
};
  /* =========================================
     DÉCONNEXION
  ========================================= */

  const handleLogout = async () => {

  try {

    await signOut(auth);

  } catch (error) {

    console.error(
      "Erreur déconnexion Firebase :",
      error
    );

  }


  /* =========================
     SUPPRIMER LA SESSION
  ========================= */

  localStorage.removeItem(
    "umiCurrentUser"
  );

  sessionStorage.removeItem(
    "umiPageAfterLogin"
  );

  sessionStorage.removeItem(
    "umiPageHistory"
  );


  /* =========================
     VIDER LES DONNÉES
     DE L'ANCIEN UTILISATEUR
  ========================= */

  setCart([]);

  setFavorites([]);

  setSelectedProduct(
    null
  );

  setSelectedCategory(
    null
  );

  setSelectedCommerceType(
    null
  );

  setPageBeforeCart(
    "home"
  );

  setPageBeforeQuote(
    "home"
  );

  setPageAfterLogin(
    null
  );

  setShowAccountPopup(
    false
  );


  /* =========================
     ACTUALISER L'UTILISATEUR
  ========================= */

  onUserChanged?.();


  /* =========================
     RÉINITIALISER NAVIGATION
  ========================= */

  pageHistoryRef.current = [];

  sessionStorage.setItem(
    "umiCurrentPage",
    "home"
  );

  pageRef.current =
    "home";

  setPage(
    "home"
  );

};

  /* =========================================
     HOME
  ========================================= */

  const renderHome = () => {

    return (

      <>

        {renderQuotePopup()}
        <Home
  user={
    currentUser
  }

  machines={
    machines
  }

  isProductFavorite={
    isProductFavorite
  }

  onToggleFavorite={(product) =>
    handleToggleFavorite(
      product,
      "machine"
    )
  }

  onBack={
    handleOpenAccount
  }

  onOpenAccount={
    handleOpenAccount
  }

  onOpenMachines={() => {

    setSelectedCategory(
      null
    );

    navigateTo(
      "machines"
    );

  }}

  onOpenCategories={() => {

    navigateTo(
      "categories"
    );

  }}

  onOpenUmiLive={() =>
    navigateTo(
      "umiLive"
    )
  }

  onOpenQuote={() =>
    handleOpenQuote(
      null
    )
  }

  onOpenRawMaterials={
    handleOpenRawMaterials
  }

  onOpenChat={
    handleOpenChat
  }

  onOpenPackaging={
    handleOpenPackaging
  }

  onOpenCart={
    handleOpenCart
  }


  /* =============================
     COMPTEURS CLIENT
  ============================= */

  quoteUnreadCount={
    clientUnreadQuotesCount
  }

  chatUnreadCount={
  currentUser?.role === "admin"
    ? adminUnreadChatsCount
    : clientUnreadChatsCount
}


  onOpenProduct={(product) => {

    setSelectedCategory(
      null
    );

    setSelectedProduct(
      product
    );

    setPageBeforeCart(
      "home"
    );

    navigateTo(
      "product"
    );

  }}
/>
        {renderAccountPopup()}

      </>

    );

  };
/* =========================================
   CATÉGORIES
========================================= */
const renderCurrentPage = () => {
  if (page === "adminAccounts") {
    return currentUser?.role === "admin" ? <AdminAccounts onBack={goBack} /> : renderHome();
  }
  if (page === "privacy" || page === "adminPrivacy") {
    return <Privacy onBack={goBack} editable={currentUser?.role === "admin"} />;
  }

if (
  page === "categories"
) {

  return (

    <>

      <Categories
        userPhoto={userPhoto}

        onBack={
          goBack
        }

        /* =========================
           OUVRIR CATÉGORIE MACHINE
        ========================= */

        onOpenCategory={(category) => {

          setSelectedCategory(
            category
          );

          navigateTo(
            "machineCategory"
          );

        }}

        /* =========================
           MATIÈRES PREMIÈRES
        ========================= */

        onOpenRawMaterials={
          handleOpenRawMaterials
        }

        /* =========================
           EMBALLAGES
        ========================= */

        onOpenPackaging={
          handleOpenPackaging
        }

        /* =========================
           DEVIS
        ========================= */

        onOpenQuote={() => {

          handleOpenQuote(
            null
          );

        }}

        /* =========================
           ACCUEIL
        ========================= */

        onHome={
          goToHome
        }

        /* =========================
           CATÉGORIES
        ========================= */

        onCategories={() => {

          if (
            pageRef.current !==
            "categories"
          ) {

            navigateTo(
              "categories"
            );

          }

        }}

        /* =========================
           UMI LIVE
        ========================= */

        onLive={() => {

          navigateTo(
            "umiLive"
          );

        }}

        /* =========================
           PANIER
        ========================= */

        onCart={() => {

          handleOpenCart();

        }}

        /* =========================
           COMPTE
        ========================= */

        onAccount={() => {

          handleOpenAccount();

        }}
      />

      {renderAccountPopup()}

    </>

  );

}
/* =========================================
   SPLASH UMI
========================================= */

if (
  page === "splash"
) {

  return (

    <Splash
      onFinish={() => {

        sessionStorage.setItem(
          "umiSplashSeen",
          "true"
        );

        navigateTo(
          "intro"
        );

      }}
    />

  );

}


/* =========================================
   INTRO
========================================= */
  /* =========================================
     INTRO
  ========================================= */

  if (
    page === "intro"
  ) {

    return (

      <Intro
        onSkip={() =>
          navigateTo(
            "home"
          )
        }
      />

    );

  }


    /* =========================================
     MATIÈRES CLIENT
  ========================================= */

  if (
    page === "rawMaterials"
  ) {

    return (

      <>

        <RawMaterials
        userPhoto={userPhoto}
        isProductFavorite={isProductFavorite}

onToggleFavorite={(product) =>
  handleToggleFavorite(
    product,
    "rawMaterial"
  )
}

          onBack={
            goBack
          }


          /* =========================
             OUVRIR PRODUIT
          ========================= */

          onOpenProduct={(product) => {

            setSelectedProduct(
              product
            );

            setSelectedCommerceType(
              "rawMaterial"
            );

            navigateTo(
              "commerceProduct"
            );

          }}


          /* =========================
             ACCUEIL
          ========================= */

          onHome={
            goToHome
          }


          /* =========================
             MACHINES
          ========================= */

          onMachines={() => {

            setSelectedCategory(
              null
            );

            navigateTo(
              "machines"
            );

          }}


          /* =========================
             UMI LIVE
          ========================= */

          onLive={() => {

            navigateTo(
              "umiLive"
            );

          }}


          /* =========================
             PANIER
          ========================= */

          onCart={() => {

            handleOpenCart();

          }}

onOpenChat={handleOpenChat}
          /* =========================
             COMPTE
          ========================= */

          onAccount={() => {

            handleOpenAccount();

          }}

        />


        {renderAccountPopup()}

      </>

    );

  }


    /* =========================================
     EMBALLAGES CLIENT
  ========================================= */

  if (
    page === "packaging"
  ) {

    return (

      <>

        <Packaging
  userPhoto={userPhoto}

  /* =========================
     FAVORIS
  ========================= */

  isProductFavorite={isProductFavorite}

  onToggleFavorite={(product) =>
    handleToggleFavorite(
      product,
      "packaging"
    )
  }

  onBack={
    goBack
  }


  /* =========================
     OUVRIR PRODUIT
  ========================= */

  onOpenProduct={(product) => {

    setSelectedProduct(
      product
    );

    setSelectedCommerceType(
      "packaging"
    );

    navigateTo(
      "commerceProduct"
    );

  }}

          /* =========================
             ACCUEIL
          ========================= */

          onHome={
            goToHome
          }


          /* =========================
             MACHINES
          ========================= */

          onMachines={() => {

            setSelectedCategory(
              null
            );

            navigateTo(
              "machines"
            );

          }}


          /* =========================
             UMI LIVE
          ========================= */

          onLive={() => {

            navigateTo(
              "umiLive"
            );

          }}


          /* =========================
             PANIER
          ========================= */

          onCart={() => {

            handleOpenCart();

          }}


          /* =========================
             COMPTE
          ========================= */

          onAccount={() => {

            handleOpenAccount();

          }}

        />


        {renderAccountPopup()}

      </>

    );

  }

    /* =========================================
     DÉTAIL COMMERCE
     MATIÈRE PREMIÈRE + EMBALLAGE
  ========================================= */

  if (
    page === "commerceProduct"
  ) {

    return (

      <>

        <CommerceProductDetail

          product={
            selectedProduct
          }

          type={
            selectedCommerceType
          }


          /* =====================================
             RETOUR
          ===================================== */

          onBack={
            goBack
          }


          /* =====================================
             AVIS CLIENTS
          ===================================== */

          onOpenReviews={(product) => {

            /*
              CommerceProductDetail nous renvoie
              le produit avec son productType :

              rawMaterial
              ou
              packaging
            */

            setSelectedProduct(
              product
            );


            navigateTo(
              "productReviews"
            );

          }}


          /* =====================================
             PANIER
          ===================================== */

          onAddToCart={
            handleAddToCart
          }


          /* =====================================
             DEVIS
          ===================================== */

          onQuote={(product) =>
            handleOpenQuote({

              ...product,

              productType:
                selectedCommerceType,

            })
          }


          /* =====================================
             FAVORIS
          ===================================== */

          isFavorite={
            isProductFavorite(
              selectedProduct,
              selectedCommerceType
            )
          }


          onToggleFavorite={() =>
            handleToggleFavorite(
              selectedProduct,
              selectedCommerceType
            )
          }

        />


        {renderAccountPopup()}

      </>

    );

  }


  /* =========================================
     AVIS PRODUIT

     MACHINES
     MATIÈRES PREMIÈRES
     EMBALLAGES
  ========================================= */

  if (
    page === "productReviews"
  ) {

    return (

      <ProductReviews

        product={
          selectedProduct
        }

        onBack={
          goBack
        }

      />

    );

  }
  /* =========================================
     FAVORIS
  ========================================= */

  if (
    page === "favorites"
  ) {

    const currentUser =
      getCurrentUser();

if (!currentUser) {
  return renderHome();
}




    return (

      <Favorites
        favorites={
          favorites
        }

        onBack={
          goBack
        }

        onOpenProduct={
          handleOpenFavoriteProduct
        }

        onRemoveFavorite={
          handleRemoveFavorite
        }
      />

    );

  }


  /* =========================================
     DEVIS CLIENT
  ========================================= */
if (page === "quote") {
  return (
    <>
      {renderHome()}

      <QuoteRequest
        user={currentUser}
        userPhoto={userPhoto}
        product={selectedProduct}

        onBack={goToHome}

        onOpenQuotes={() => {
          navigateTo("myQuotes");
        }}

        onHome={goToHome}

        onMachines={() => {
          setSelectedCategory(null);
          navigateTo("machines");
        }}

        onLive={() => {
          navigateTo("umiLive");
        }}

        onCart={handleOpenCart}

        onAccount={handleOpenAccount}
      />
    </>
  );
}
  /* =========================================
     CHAT CLIENT
  ========================================= */

  if (
    page === "clientChat"
  ) {

    return (

      <ClientChat
userPhoto={userPhoto}
  user={currentUser}

  onBack={goBack}


  /* ACCUEIL */

  onHome={
    goToHome
  }


  /* MACHINES */

  onMachines={() => {

    setSelectedCategory(
      null
    );

    navigateTo(
      "machines"
    );

  }}


  /* UMI LIVE */

  onLive={() => {

    navigateTo(
      "umiLive"
    );

  }}


  /* PANIER */

  onCart={() => {

    handleOpenCart();

  }}


  /* COMPTE */

  onAccount={() => {

    handleOpenAccount();

  }}

/>

    );

  }


  /* =========================================
     PANIER
  ========================================= */

  if (
    page === "cart"
  ) {

    return (

      <>

        <Cart
          cart={
            cart
          }

          onBack={
            goBack
          }

          onHome={
            goToHome
          }

          onCategories={() => {

            setSelectedCategory(
              null
            );


            navigateTo(
              "machines"
            );

          }}

          onRemove={
            handleRemoveFromCart
          }

          onIncreaseQuantity={
            handleIncreaseQuantity
          }

          onDecreaseQuantity={
            handleDecreaseQuantity
          }

          onContinueOrder={
            handleContinueOrder
          }

          onOpenProduct={(product) => {

            if (
              product?.productType ===
                "rawMaterial" ||
              product?.productType ===
                "packaging"
            ) {

              setSelectedProduct(
                product
              );


              setSelectedCommerceType(
                product.productType
              );


              navigateTo(
                "commerceProduct"
              );


              return;

            }


            const freshMachine =
              machines.find(
                (machine) =>
                  machine.id ===
                  product.id
              );


            setSelectedProduct(
              freshMachine ||
              product
            );


            setPageBeforeCart(
              "cart"
            );


            navigateTo(
              "product"
            );

          }}
        />


        {renderAccountPopup()}

      </>

    );

  }


  /* =========================================
     COMMANDE
  ========================================= */

  if (
  page === "order"
) {

  return (

    <>

      <Order
        cart={cart}
        user={getCurrentUser()}
        onBack={goBack}
        onConfirmOrder={handleOpenPayment}
      />

      {renderAccountPopup()}

    </>

  );

}


  /* =========================================
     PAIEMENT
  ========================================= */

  if (
    page === "payment"
  ) {

    return (

      <>

        <Payment
  cart={livePaymentItems ?? cart}
  user={getCurrentUser()}
  buyerInfo={buyerInfo}
  onBack={goBack}
  onHome={goToHome}
  onOpenMachines={() => {
    setSelectedCategory(null);
    navigateTo("machines");
  }}
  onOpenUmiLive={() => {
    navigateTo("umiLive");
  }}
  onOpenCart={() => {
    loadUserCart();
    setPageBeforeCart("payment");
    navigateTo("cart");
  }}
  onOpenAccount={() => {
    navigateTo("account");
  }}
/>


        {renderAccountPopup()}

      </>

    );

  }


  /* =========================================
     MES COMMANDES
  ========================================= */

  if (
  page === "myOrders"
) {

  return (

    <MyOrders
      orders={orders}
      onBack={goBack}
      onOpenOrder={(order) => {
        setSelectedOrder(order);
        navigateTo("orderDetail");
      }}
    />

  );

}

/* =========================================
   MES DEVIS
========================================= */

if (
  page === "myQuotes"
) {

  return (

    <>
      <MyQuotes

        user={currentUser}

        onBack={goBack}


        /* =========================
           ACCUEIL
        ========================= */

        onHome={() => {
          goToHome();
        }}


        /* =========================
           MACHINES
        ========================= */

        onMachines={() => {

          setSelectedCategory(null);

          navigateTo(
            "machines"
          );

        }}


        /* =========================
           UMI LIVE
        ========================= */

        onLive={() => {

          navigateTo(
            "umiLive"
          );

        }}


        /* =========================
           PANIER
        ========================= */

        onCart={() => {

          loadUserCart();

          setPageBeforeCart(
            "myQuotes"
          );

          navigateTo(
            "cart"
          );

        }}


        /* =========================
           COMPTE
        ========================= */

        onAccount={() => {

          handleOpenAccount();

        }}

      />


      {renderAccountPopup()}

    </>

  );

}

/* =========================================
   DÉTAIL D'UNE COMMANDE
========================================= */

if (
  page === "orderDetail"
) {

  return (

    <OrderDetail
      order={selectedOrder}
      onBack={goBack}
    />

  );

}


  /* =========================================
     CRÉER LIVE ADMIN
  ========================================= */

  if (
    page === "createLive"
  ) {

    return (

      <CreateLive
  onBack={goBack}
  machines={machines}
  userPhoto={userPhoto}
/>

    );

  }


  /* =========================================
     PROGRAMMER LIVE ADMIN
  ========================================= */

  if (
    page === "scheduleLive"
  ) {

    return (

      <ScheduleLive
        onBack={
          goBack
        }
      />

    );

  }


  /* =========================================
     REDIFFUSIONS ADMIN
  ========================================= */

  if (
    page === "adminReplays"
  ) {

    return (

      <AdminReplays
        onBack={
          goBack
        }
      />

    );

  }


  /* =========================================
     GÉRER UMI LIVE
  ========================================= */

  if (
    page === "adminLive"
  ) {

    return (

      <AdminLive
        onBack={
          goBack
        }

        onCreateLive={() =>
          navigateTo(
            "createLive"
          )
        }

        onScheduleLive={() =>
          navigateTo(
            "scheduleLive"
          )
        }

        onOpenReplays={() =>
          navigateTo(
            "adminReplays"
          )
        }

        onHome={
          goToHome
        }

        onOpenCart={() => {

          loadUserCart();


          setPageBeforeCart(
            "adminLive"
          );


          navigateTo(
            "cart"
          );

        }}

        onLogout={
          handleLogout
        }
      />

    );

  }


  /* =========================================
     ADMIN MATIÈRES PREMIÈRES
  ========================================= */

  if (
    page === "adminRawMaterials"
  ) {

    return (

      <AdminRawMaterials
        onBack={
          goBack
        }

        onOpenPublished={() =>
          navigateTo(
            "adminRawMaterialsList"
          )
        }
        product={selectedProduct}
      />

    );

  }


  /* =========================================
     MATIÈRES PUBLIÉES
  ========================================= */

  if (
    page === "adminRawMaterialsList"
  ) {

    return (

      <AdminRawMaterialsList

  onBack={() => {

    navigateTo(
      "adminDashboard"
    );

  }}

  onEdit={(product) => {

    setSelectedProduct(
      product
    );

    navigateTo(
      "adminRawMaterials"
    );

  }}

/>

    );

  }


  /* =========================================
     ADMIN EMBALLAGES
  ========================================= */

  if (
    page === "adminPackaging"
  ) {

    return (

      <AdminPackaging
        onBack={() => {

          setSelectedProduct(
            null
          );


          goBack();

        }}

        onOpenPublished={() => {

          setSelectedProduct(
            null
          );


          navigateTo(
            "adminPackagingList"
          );

        }}

        productToEdit={
          selectedProduct?.productType ===
          "packaging"
            ? selectedProduct
            : null
        }

        onEditFinished={() => {

          setSelectedProduct(
            null
          );


          navigateTo(
            "adminPackagingList"
          );

        }}
      />

    );

  }


  /* =========================================
     EMBALLAGES PUBLIÉS
  ========================================= */

  if (
    page === "adminPackagingList"
  ) {

    return (

      <AdminPackagingList

  onBack={() => {

    setSelectedProduct(
      null
    );

    navigateTo(
      "adminDashboard"
    );

  }}

  onEdit={(product) => {

    setSelectedProduct({

      ...product,

      productType:
        "packaging",

    });

    navigateTo(
      "adminPackaging"
    );

  }}

/>

    );

  }


  /* =========================================
   ADMIN DEVIS
========================================= */

if (
  page === "adminQuotes"
) {

  return (
  <>

    <AdminQuotes

      /* RETOUR */
      onBack={
        goBack
      }


      /* ACCUEIL ADMIN */
      onOpenAdminHome={() =>
        navigateTo(
          "adminDashboard"
        )
      }


      /* CATALOGUE MACHINES */
      onOpenMachines={() =>
        navigateTo(
          "adminMachines"
        )
      }


      /* UMI LIVE ADMIN */
      onOpenAdminLive={() =>
        navigateTo(
          "adminLive"
        )
      }


      /* DEVIS */
      onOpenQuotes={() =>
        navigateTo(
          "adminQuotes"
        )
      }

/* COMMANDES CLIENTS */

onOpenOrders={() =>
  navigateTo(
    "adminOrders"
  )
}
      /* MESSAGES CLIENTS */
      onOpenAdminChat={() =>
        navigateTo(
          "adminChat"
        )
      }

       />

  </>
);

}
/* =========================================
   COMMANDES ADMIN
========================================= */

if (
  page === "adminOrders"
) {

  return (
    <>

      <AdminOrders
        onBack={() =>
          navigateTo(
            "adminDashboard"
          )
        }
      />

  

    </>
  );

}
  /* =========================================
     ADMIN CHAT
  ========================================= */

  if (
  page === "adminChat"
) {

  return (
    <>

      <AdminChat
        user={
          getCurrentUser()
        }

        onBack={
          goBack
        }
      />

      

    </>
  );

}
  /* =========================================
     GESTION MACHINES
  ========================================= */

  if (
    page === "adminMachines"
  ) {

    return (

      <AdminMachines
        machines={
          machines
        }

        onBack={
          goBack
        }

        onAddMachine={() =>
          navigateTo(
            "addMachine"
          )
        }

        onEditMachine={(machine) => {

          setSelectedProduct(
            machine
          );


          navigateTo(
            "editMachine"
          );

        }}

        onMachineDeleted={(machineId) => {

          setMachines(
            (previousMachines) =>
              previousMachines.filter(
                (machine) =>
                  machine.id !==
                  machineId
              )
          );

        }}
      />

    );

  }


  /* =========================================
   TABLEAU ADMIN
========================================= */
/* =========================================
   MÉDIA D'ACCUEIL ADMIN
========================================= */

if (
  page === "adminHomeMedia"
) {

  return (

    <AdminHomeMedia
      onBack={() =>
        navigateTo(
          "adminDashboard"
        )
      }
    />

  );

}
if (
  page === "adminDashboard"
) {

  return (

    <AdminDashboard
      onOpenAccounts={() => navigateTo("adminAccounts")}
      onOpenPrivacy={() => navigateTo("adminPrivacy")}

      /* ACCUEIL */

      onHome={
        goToHome
      }


      /* GESTION MACHINES */

      onOpenMachines={() =>
        navigateTo(
          "adminMachines"
        )
        
      }
      onOpenHomeMedia={() =>
  navigateTo(
    "adminHomeMedia"
  )
}


      /* UMI LIVE */

      onOpenAdminLive={() =>
        navigateTo(
          "adminLive"
        )
      }


      /* MATIÈRES PREMIÈRES */

      onOpenRawMaterials={() => {

        setSelectedProduct(
          null
        );

        navigateTo(
          "adminRawMaterials"
        );

      }}


      /* EMBALLAGES */

      onOpenPackaging={() => {

        setSelectedProduct(
          null
        );

        navigateTo(
          "adminPackaging"
        );

      }}


      /* DEVIS */

      onOpenQuotes={() =>
        navigateTo(
          "adminQuotes"
        )
      }

/* COMMANDES CLIENTS */

onOpenOrders={() =>
  navigateTo(
    "adminOrders"
  )
}
/* AVIS CLIENTS */

onOpenReviews={() =>
  navigateTo(
    "adminReviews"
  )
}
      /* MESSAGES CLIENTS */

      onOpenAdminChat={() =>
        navigateTo(
          "adminChat"
        )
      }


      /* DÉCONNEXION */

      onLogout={
        handleLogout
      }

    />

  );

}
/* =========================================
   AVIS CLIENTS ADMIN
========================================= */

if (
  page === "adminReviews"
) {

  return (

    <AdminReviews
      onBack={
        goBack
      }
    />

  );

}
  /* =========================================
     AJOUT MACHINE
  ========================================= */

  if (
    page === "addMachine"
  ) {

    return (

      <AddMachine
        onBack={
          goBack
        }

        onSaveMachine={(newMachine) => {

          setMachines(
            (previousMachines) => {

              const alreadyExists =
                previousMachines.some(
                  (machine) =>
                    machine.id ===
                    newMachine.id
                );


              if (
                alreadyExists
              ) {

                return previousMachines.map(
                  (machine) =>
                    machine.id ===
                    newMachine.id
                      ? newMachine
                      : machine
                );

              }


              return [

                ...previousMachines,

                newMachine,

              ];

            }
          );


          goBack();

        }}
      />

    );

  }


  /* =========================================
     MODIFIER MACHINE
  ========================================= */

  if (
    page === "editMachine"
  ) {

    return (

      <EditMachine
        machine={
          selectedProduct
        }

        onBack={
          goBack
        }

        onMachineUpdated={(updatedMachine) => {

          setMachines(
            (previousMachines) =>
              previousMachines.map(
                (machine) =>
                  machine.id ===
                  updatedMachine.id
                    ? {
                        ...machine,
                        ...updatedMachine,
                      }
                    : machine
              )
          );


          setSelectedProduct(
            updatedMachine
          );


          goBack();

        }}
      />

    );

  }


  /* =========================================
     LOGIN
  ========================================= */

  if (
    page === "login"
  ) {

    return (

      <Login
        onBack={
          goBack
        }

        onRegister={() =>
          navigateTo(
            "register"
          )
        }

        onLoginSuccess={() => {
  onUserChanged?.();

  loadUserCart();
  loadUserFavorites();

  setPageAfterLogin(null);
  sessionStorage.removeItem("umiPageAfterLogin");
  setShowAccountPopup(false);

  goToHome();
}}

        onAdminLoginSuccess={() => {

  /*
    Un administrateur ne doit pas
    conserver les données du client
    précédemment connecté.
  */

  setCart([]);
setFavorites([]);

  onUserChanged?.();

  /*
    Nettoyer une éventuelle destination
    prévue pour un client.
  */

  sessionStorage.removeItem(
    "umiPageAfterLogin"
  );

  /*
    Aller directement dans
    l'administration.
  */

  navigateTo(
    "adminDashboard"
  );

}}
      />

    );

  }


  /* =========================================
     INSCRIPTION
  ========================================= */

  if (
    page === "register"
  ) {

    return (

      <Register
        onBack={
          goBack
        }

        onLogin={() =>
          navigateTo(
            "login"
          )
        }

        onRegisterSuccess={() => {

          onUserChanged?.();

          loadUserCart();

          loadUserFavorites();


          if (
            goToPageAfterLogin()
          ) {

            return;

          }


          navigateTo(
            "home"
          );

        }}
      />

    );

  }


  /* =========================================
     PRODUIT MACHINE
  ========================================= */

  if (
    page === "product"
  ) {

    return (

      <>

        <ProductDetail
  product={selectedProduct}

  onOpenReviews={() => {
    navigateTo("productReviews");
  }}

  onBack={goBack}

  onHome={goToHome}

  onCategories={() => {
    setSelectedCategory(null);
    navigateTo("machines");
  }}

  onOpenCart={() => {
    setPageBeforeCart(pageRef.current);
    navigateTo("cart");
  }}

  onOrder={handleOrder}

  onAddToCart={handleAddToCart}

  isFavorite={isProductFavorite(
    selectedProduct,
    "machine"
  )}

  onToggleFavorite={() =>
    handleToggleFavorite(
      selectedProduct,
      "machine"
    )
  }
/>

        {renderAccountPopup()}

      </>

    );

  }


  /* =========================================
     CATÉGORIE MACHINE
  ========================================= */

  if (
    page === "machineCategory"
  ) {

    return (

      <MachineCategory
        category={
          selectedCategory
        }

        machines={
          machines
        }

        onOpenProduct={(machine) => {

          setSelectedProduct(
            machine
          );


          setPageBeforeCart(
            "machineCategory"
          );


          navigateTo(
            "product"
          );

        }}

        onBack={
          goBack
        }
      />

    );

  }


  /* =========================================
     MACHINES CLIENT
  ========================================= */

  

      /* =========================================
   MACHINES CLIENT
========================================= */

if (
  page === "machines"
) {

  return (

    <>

      <Machines

  user={currentUser}

  userPhoto={userPhoto}

  machines={machines}

  onBack={
    goBack
  }


        /* =========================
           OUVRIR UNE CATÉGORIE
        ========================= */

        onOpenCategory={(category) => {

          setSelectedCategory(
            category
          );

          navigateTo(
            "machineCategory"
          );

        }}


        /* =========================
           OUVRIR UNE MACHINE
           DEPUIS LA RECHERCHE
        ========================= */

        onOpenProduct={(machine) => {

          setSelectedProduct(
            machine
          );

          setSelectedCategory(
            null
          );

          setPageBeforeCart(
            "machines"
          );

          navigateTo(
            "product"
          );

        }}


        /* =========================
           ACCUEIL
        ========================= */

        onHome={() => {

          goToHome();

        }}


        /* =========================
           MACHINES
        ========================= */

        onMachines={() => {

          setSelectedCategory(
            null
          );

        }}


        /* =========================
           UMI LIVE
        ========================= */

        onLive={() => {

          navigateTo(
            "umiLive"
          );

        }}


        /* =========================
           PANIER
        ========================= */

        onCart={() => {

          handleOpenCart();

        }}


        /* =========================
           COMPTE
        ========================= */

        onAccount={() => {

          handleOpenAccount();

        }}

      />


      {renderAccountPopup()}

    </>

  );

}


  /* =========================================
     UMI LIVE CLIENT
  ========================================= */

  if (
    page === "umiLive"
  ) {

    return (

      <>

        <UmiLive
  onBuyNow={(machine) => {
  if (!machine?.id) return;

  if (!getCurrentUser()) {
    setShowAccountPopup(true);
    return;
  }

  setShowLiveCart(false);
  setLiveCheckoutStep("order");
  setLivePaymentItems(null);

  setLiveOrderProduct({
  ...machine,
  quantity: Math.max(
    1,
    Math.floor(Number(machine.quantity) || 1)
  ),
});
}}
        user={currentUser}
        machines={machines}
      
        onAddToCart={handleAddToCart}
        favorites={favorites}
onToggleFavorite={handleToggleFavorite}
        previewMode={!!spectatorPreview}
previewProduct={spectatorPreview}
        userPhoto={userPhoto}
          onBack={
            goBack
          }

          onOpenClientVideos={() => requireLogin("clientVideos")}
          onCreateClientLive={() => {

            requireLogin(
              "createClientLive"
            );

          }}

          onOpenMyLives={() => {

            requireLogin(
              "myClientLives"
            );

          }}
                    onHome={
            goToHome
          }
onCategories={() => {
  setSelectedCategory(null);
  navigateTo("machines");
}}

onOpenCart={() => setShowLiveCart(true)}

          onMachines={() => {

            setSelectedCategory(
              null
            );

            navigateTo(
              "machines"
            );

          }}


          onLive={() => {

            navigateTo(
              "umiLive"
            );

          }}


        onCart={() => setShowLiveCart(true)}
          onOpenChat={() => {
  handleOpenChat();
}}


          onAccount={() => {
            if (!getCurrentUser()) {
              setShowInlineLogin(true);
              return;
            }
            handleOpenAccount();
          }}
        />
{liveOrderProduct &&
  createPortal(
    <div
      className="umi-live-order-overlay"
      onClick={() => setLiveOrderProduct(null)}
    >
      <div
        className="umi-live-order-window"
        role="dialog"
        aria-modal="true"
        aria-label="Commander la machine"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="umi-live-order-close"
          aria-label="Fermer la commande"
          onClick={() => setLiveOrderProduct(null)}
        >
          ×
        </button>

        {liveCheckoutStep === "order" ? (
  <Order
    cart={livePaymentItems ?? [liveOrderProduct]}
    user={currentUser}
    onBack={() => setLiveOrderProduct(null)}
    onConfirmOrder={(orderData) => {
      setBuyerInfo(orderData.buyerInfo);
      setLivePaymentItems(orderData.cart);
      setLiveCheckoutStep("payment");
    }}
  />
) : (
  <Payment
    embedded
    cart={livePaymentItems ?? [liveOrderProduct]}
    user={currentUser}
    buyerInfo={buyerInfo}
    onBack={() => setLiveCheckoutStep("order")}
  />
)}
      </div>
    </div>,
    document.body
  )}
{showLiveCart && createPortal(
  <div
    className="umi-live-cart-overlay"
    onClick={() => setShowLiveCart(false)}
  >
    <div
      className="umi-live-cart-window"
      role="dialog"
      aria-modal="true"
      aria-label="Mon panier"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="umi-live-cart-close"
        onClick={() => setShowLiveCart(false)}
        aria-label="Fermer le panier et continuer la vidéo"
      >
        ×
      </button>

      <Cart
        cart={cart}
        onBack={() => setShowLiveCart(false)}
        onRemove={handleRemoveFromCart}
        onIncreaseQuantity={handleIncreaseQuantity}
        onDecreaseQuantity={handleDecreaseQuantity}

        onHome={() => {
          setShowLiveCart(false);
          goToHome();
        }}

        onCategories={() => {
          setShowLiveCart(false);
          setSelectedCategory(null);
          navigateTo("machines");
        }}

       onContinueOrder={() => {
  if (!getCurrentUser()) {
    setShowAccountPopup(true);
    return;
  }

  if (!cart.length) return;

  setLivePaymentItems(
    cart.map((item) => ({ ...item }))
  );

  setLiveCheckoutStep("order");
  setLiveOrderProduct({ ...cart[0] });
  setShowLiveCart(false);
}}

        onOpenProduct={(product) => {
          setShowLiveCart(false);

          if (
            product?.productType === "rawMaterial" ||
            product?.productType === "packaging"
          ) {
            setSelectedProduct(product);
            setSelectedCommerceType(product.productType);
            navigateTo("commerceProduct");
            return;
          }

          const freshMachine = machines.find(
            (machine) => machine.id === product.id
          );

          setSelectedProduct(freshMachine || product);
          setPageBeforeCart("umiLive");
          navigateTo("product");
        }}
      />
    </div>
  </div>,
  document.body
)}
        {renderAccountPopup()}

      </>

    );

  }


  /* =========================================
     CRÉER LIVE CLIENT
  ========================================= */

  if (
    page === "createClientLive"
  ) {

    const currentUser =
      getCurrentUser();


    if (!currentUser) {

      return (

        <>

          <UmiLive
            onAccount={() => setShowInlineLogin(true)}
            onBack={
              goBack
            }

            onCreateClientLive={() => {

              setPageAfterLogin(
                "createClientLive"
              );


              setShowAccountPopup(
                true
              );

            }}

            onOpenMyLives={() => {

              setPageAfterLogin(
                "myClientLives"
              );


              setShowAccountPopup(
                true
              );

            }}
          />


          {renderAccountPopup()}

        </>

      );

    }


    return (

      <CreateClientLive
  onBack={
    goBack
  }

  onOpenSpectatorPreview={(live) => {
    sessionStorage.setItem(
      "umiSpectatorPreview",
      JSON.stringify(live)
    );

    navigateTo("umiLive");
  }}
/>

    );

  }


  /* =========================================
     MES LIVE CLIENT
  ========================================= */

  if (page === "sellerSales") {
    return currentUser ? <SellerSales onBack={goBack} /> : renderHome();
  }

  if (page === "clientVideos") {
    if (!currentUser) return renderHome();
    return <AdminLive clientMode onBack={goBack} onCreateLive={() => requireLogin("createClientLive")} onScheduleLive={() => requireLogin("myClientLives")} onOpenReplays={() => navigateTo("umiLive")} onHome={goToHome} onOpenCart={handleOpenCart} onLogout={handleLogout} />;
  }

  if (
    page === "myClientLives"
  ) {

    const currentUser =
      getCurrentUser();


    if (!currentUser) {

      return renderHome();

    }


    return (

      <MyClientLives
        onBack={
          goBack
        }

        onHome={
          goToHome
        }

        onOpenCart={() => {

          loadUserCart();


          setPageBeforeCart(
            "myClientLives"
          );


          navigateTo(
            "cart"
          );

        }}

        onLogout={
          handleLogout
        }
      />

    );

  }


  /* =========================================
     COMPTE
  ========================================= */

  if (
    page === "account"
  ) {

    const currentUser =
      getCurrentUser();


    if (!currentUser) {

      return renderHome();

    }


    return (

      <Account
        onOpenClientVideos={() => requireLogin("clientVideos")}
        onOpenSellerSales={() => requireLogin("sellerSales")}
        onOpenPrivacy={() => navigateTo("privacy")}
        user={
          currentUser
        }

        onBack={
          goBack
        }

        onHome={
          goToHome
        }

        onCategories={() => {

          setSelectedCategory(
            null
          );


          navigateTo(
            "machines"
          );

        }}

        onOpenFavorites={
          handleOpenFavorites
        }

        onOpenOrders={async () => {

          await loadUserOrders();


          navigateTo(
            "myOrders"
          );

        }}
        onOpenQuotes={() => {
  navigateTo("myQuotes");
}}

        onOpenCart={() => {

          loadUserCart();


          setPageBeforeCart(
            "account"
          );


          navigateTo(
            "cart"
          );

        }}

        onOpenAdmin={() => {

          if (
            currentUser.role !==
            "admin"
          ) {

            return;

          }


          navigateTo(
            "adminDashboard"
          );

        }}

        onUserChanged={
          onUserChanged
        }

        onLogout={
          handleLogout
        }
      />

    );

  }


  /* =========================================
     ACCUEIL
  ========================================= */

  if (
    page === "home"
  ) {

    return renderHome();

  }


    return renderHome();
};

const isAdminPage =
  currentUser?.role === "admin";

const isLivePage = [
  "umiLive",
  "adminLive",
  "createLive",
  "scheduleLive",
  "adminReplays",
  "createClientLive",
  "myClientLives",
  "clientVideos",
].includes(page);

return (
  <>
    {renderCurrentPage()}
      <HighlightUploadStatus />
    {showQuoteWindow && currentUser?.role === "admin" && (
      <UmiModal title="Devis UMI" wide onClose={() => setShowQuoteWindow(false)}>
        <div className="umi-quotes-window">
          <AdminQuotes embedded onBack={() => setShowQuoteWindow(false)} />
        </div>
        <style>{`
          .umi-quotes-window .admin-quotes-page {
            min-height: 0 !important;
            padding-bottom: 16px !important;
          }
          .umi-quotes-window .admin-bottom-nav {
            display: none !important;
          }
        `}</style>
      </UmiModal>
    )}
    {showMessageWindow && <UmiModal title="Messages UMI" wide={currentUser?.role === "admin"} onClose={() => setShowMessageWindow(false)}>
      {currentUser?.role === "admin"
        ? <AdminChat user={currentUser} onBack={() => setShowMessageWindow(false)} />
        : <ClientChat user={currentUser || getCurrentUser()} userPhoto={currentUser?.photoURL || ""} embedded />}
    </UmiModal>}
    {currentUser?.role !== "admin" && currentUser && !showMessageWindow && !["login", "register", "splash", "intro", "clientChat", "createClientLive"].includes(page) &&
      <DraggableMessageBubble count={clientUnreadChatsCount} onOpen={handleOpenChat} />}

    <div
      style={{
        display:
          isAdminPage && !isLivePage
            ? "contents"
            : "none",
      }}
    >
      {renderAdminNotifications()}
    </div>
  </>
);

}

/* =========================================
   APPLICATION GLOBALE
========================================= */

function App() {

  const [
    currentUser,
    setCurrentUser,
  ] = useState(() => {

    try {

      const savedUser =
        localStorage.getItem(
          "umiCurrentUser"
        );


      if (!savedUser) {

        return null;

      }


      return JSON.parse(
        savedUser
      );


    } catch (error) {

      console.error(
        "Erreur utilisateur global :",
        error
      );


      return null;

    }

  });


  useEffect(() => {
    const uid = currentUser?.userId || currentUser?.uid;
    if (!uid) return;
    return onSnapshot(doc(db, "users", uid), async (snapshot) => {
      if (snapshot.exists() && !snapshot.data().blocked && !snapshot.data().deleting) return;
      localStorage.removeItem("umiCurrentUser");
      setCurrentUser(null);
      try { await signOut(auth); } catch (error) { console.error("Déconnexion du compte :", error); }
      await umiNotify(snapshot.exists() ? "Ce compte est bloqué. Contactez UMI." : "Ce compte n’est plus disponible.");
    }, (error) => console.error("Vérification de l’accès du compte :", error));
  }, [currentUser?.userId, currentUser?.uid]);

  const refreshCurrentUser = (updatedUser = null) => {
  try {
    // Si Account.jsx nous transmet directement
    // l'utilisateur mis à jour, on l'utilise immédiatement.
    if (updatedUser) {
      localStorage.setItem(
        "umiCurrentUser",
        JSON.stringify(updatedUser)
      );

      setCurrentUser(updatedUser);

      return;
    }

    // Sinon, on récupère l'utilisateur enregistré.
    const savedUser =
      localStorage.getItem("umiCurrentUser");

    if (!savedUser) {
      setCurrentUser(null);
      return;
    }

    const parsedUser =
      JSON.parse(savedUser);

    setCurrentUser(parsedUser);

  } catch (error) {
    console.error(
      "Erreur actualisation utilisateur :",
      error
    );

    setCurrentUser(null);
  }
  
};
/* =========================================
   NOTIFICATIONS ADMIN
========================================= */

const [
  adminNewQuotesCount,
  setAdminNewQuotesCount,
] = useState(0);

const [
  adminUnreadChatsCount,
  setAdminUnreadChatsCount,
] = useState(0);

  useEffect(() => {

    const handleStorageChange =
      () => {

        refreshCurrentUser();

      };


    window.addEventListener(
      "storage",
      handleStorageChange
    );


    return () => {

      window.removeEventListener(
        "storage",
        handleStorageChange
      );

    };

  }, []);

/* =========================================
   COMPTEURS ADMIN EN TEMPS RÉEL
========================================= */
useEffect(() => {

  let unsubscribeQuotes = null;
  let unsubscribeChats = null;


  const stopCounters = () => {

    unsubscribeQuotes?.();
    unsubscribeChats?.();

    unsubscribeQuotes = null;
    unsubscribeChats = null;

  };


  const unsubscribeAuth =
    auth.onAuthStateChanged(
      (firebaseUser) => {

        stopCounters();


        setAdminNewQuotesCount(0);

        setAdminUnreadChatsCount(0);


        if (
          !firebaseUser ||
          currentUser?.role !== "admin"
        ) {
          return;
        }


        /* =====================================
           COMPTEUR DEVIS ADMIN
        ===================================== */

        unsubscribeQuotes =
          onSnapshot(
            collection(
              db,
              "quotes"
            ),

            (snapshot) => {

              const count =
                snapshot.docs.filter(
                  (document) => {

                    const data =
                      document.data();

                    return (
                      data.adminSeen !== true
                    );

                  }
                ).length;


              setAdminNewQuotesCount(
                count
              );

            },

            (error) => {

              console.error(
                "Erreur compteur devis admin :",
                error
              );

              setAdminNewQuotesCount(0);

            }
          );


        /* =====================================
           COMPTEUR MESSAGES ADMIN
        ===================================== */

        unsubscribeChats =
          onSnapshot(
            collection(
              db,
              "conversations"
            ),

            (snapshot) => {

              const count =
                snapshot.docs.reduce(
                  (
                    total,
                    document
                  ) => {

                    const data =
                      document.data();


                    /*
                      Nouveau système :
                      nombre réel de messages
                      non lus.

                      Anciennes conversations :
                      si unreadAdminCount
                      n'existe pas encore,
                      unreadAdmin=true vaut 1.
                    */

                    const unreadCount =
                      Number(
                        data.unreadAdminCount ??
                        (
                          data.unreadAdmin === true
                            ? 1
                            : 0
                        )
                      );


                    return (
                      total +
                      (
                        Number.isFinite(
                          unreadCount
                        )
                          ? unreadCount
                          : 0
                      )
                    );

                  },
                  0
                );


              setAdminUnreadChatsCount(
                count
              );

            },

            (error) => {

              console.error(
                "Erreur compteur chat admin :",
                error
              );

              setAdminUnreadChatsCount(0);

            }
          );

      }
    );


  return () => {

    unsubscribeAuth();

    stopCounters();

  };

}, [
  currentUser?.role,
  currentUser?.userId,
  currentUser?.uid,
]);


/* =========================================
   AFFICHAGE APPLICATION
========================================= */

return (

  <>

    <AppContent

      currentUser={
        currentUser
      }

      onUserChanged={
        refreshCurrentUser
      }

      adminNewQuotesCount={
        adminNewQuotesCount
      }

      adminUnreadChatsCount={
        adminUnreadChatsCount
      }

    />

  </>

);

}


export default App;