import { useEffect, useRef, useState } from "react";

import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

import "./App.css";

import Intro from "./Intro";
import Login from "./Login";
import Register from "./Register";

import Home from "./Home";
import Cart from "./Cart";
import Account from "./Account";
import Order from "./Order";
import Payment from "./Payment";
import MyOrders from "./MyOrders";

import UmiLive from "./UmiLive";
import CreateClientLive from "./CreateClientLive";
import MyClientLives from "./MyClientLives";

import AdminDashboard from "./AdminDashboard";
import AdminMachines from "./AdminMachines";
import AdminLive from "./AdminLive";
import AdminReplays from "./AdminReplays";
import CreateLive from "./CreateLive";
import ScheduleLive from "./ScheduleLive";

import AddMachine from "./AddMachine";
import EditMachine from "./EditMachine";
import Machines from "./Machines";
import MachineCategory from "./MachineCategory";
import ProductDetail from "./ProductDetail";

import RawMaterials from "./RawMaterials";
import Packaging from "./Packaging";
import CommerceProductDetail from "./CommerceProductDetail";
import QuoteRequest from "./QuoteRequest";
import ClientChat from "./ClientChat";

import AdminRawMaterials from "./AdminRawMaterials";
import AdminRawMaterialsList from "./AdminRawMaterialsList";

import AdminPackaging from "./AdminPackaging";
import AdminPackagingList from "./AdminPackagingList";

import AdminQuotes from "./AdminQuotes";
import AdminChat from "./AdminChat";
import AdminChatBubble from "./AdminChatBubble";


function AppContent({ onUserChanged }) {
  /* =========================================
     PAGE
  ========================================= */

  const [page, setPage] = useState(() => {

    const savedPage =
      sessionStorage.getItem("umiCurrentPage");

    return savedPage || "intro";

  });


  /* =========================================
     HISTORIQUE DE NAVIGATION
  ========================================= */

  const pageHistoryRef = useRef([]);

  const pageRef = useRef(page);


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

        if (Array.isArray(parsedHistory)) {

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
     NAVIGATION
  ========================================= */

  const navigateTo = (newPage) => {

    if (!newPage) {
      return;
    }


    const currentPage =
      pageRef.current;


    if (newPage === currentPage) {
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


  /* =========================================
     RETOUR PAGE PRÉCÉDENTE
  ========================================= */

  const goBack = () => {

    const history = [
      ...pageHistoryRef.current,
    ];


    let previousPage = null;


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
     ACCUEIL
  ========================================= */

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


  const [
    pageBeforeCart,
    setPageBeforeCart,
  ] = useState("home");


  const [
    showAccountPopup,
    setShowAccountPopup,
  ] = useState(false);


  const [
    pageAfterLogin,
    setPageAfterLogin,
  ] = useState(null);


  /* =========================================
     MÉMORISER PAGE ACTUELLE
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


          setMachines(
            machinesData
          );


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


              if (!refreshedMachine) {

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

  const goToPageAfterLogin = () => {

    if (pageAfterLogin) {

      const destination =
        pageAfterLogin;


      setPageAfterLogin(
        null
      );


      setShowAccountPopup(
        false
      );


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


  const normalizeCart = (
    cartData
  ) => {

    if (!Array.isArray(cartData)) {

      return [];

    }


    return cartData.map(
      (item) => ({

        ...item,

        quantity:
          Number(item?.quantity) >= 1
            ? Number(item.quantity)
            : 1,

      })
    );

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


      if (!currentUser?.userId) {

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

              id: document.id,

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
     POPUP CONNEXION
  ========================================= */

  const renderAccountPopup = () => {

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

              setShowAccountPopup(
                false
              );


              navigateTo(
                "login"
              );

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

  const handleOpenChat = () => {

    const currentUser =
      getCurrentUser();


    if (!currentUser) {

      setPageAfterLogin(
        "clientChat"
      );


      setShowAccountPopup(
        true
      );


      return;

    }


    navigateTo(
      "clientChat"
    );

  };


  /* =========================================
     DEVIS
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


    navigateTo(
      "quote"
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

  const handleAddToCart = (
    product
  ) => {

    const currentUser =
      getCurrentUser();


    if (!currentUser) {

      setShowAccountPopup(
        true
      );


      return;

    }


    const cartKey =
      getCartStorageKey(
        currentUser
      );


    let currentUserCart = [];


    try {

      const savedCart =
        cartKey
          ? localStorage.getItem(
              cartKey
            )
          : null;


      if (savedCart) {

        currentUserCart =
          normalizeCart(
            JSON.parse(
              savedCart
            )
          );

      }


    } catch (error) {

      console.error(
        "Erreur lecture panier :",
        error
      );

    }


    const requestedQuantity =
      Math.max(
        1,
        Number(
          product?.quantity
        ) || 1
      );


    const existingProductIndex =
      currentUserCart.findIndex(
        (item) =>
          item.id ===
          product.id
      );


    let newCart;


    if (
      existingProductIndex !==
      -1
    ) {

      newCart =
        currentUserCart.map(
          (item, index) => {

            if (
              index ===
              existingProductIndex
            ) {

              return {

                ...item,

                quantity:
                  (
                    Number(
                      item.quantity
                    ) || 1
                  ) +
                  requestedQuantity,

              };

            }


            return item;

          }
        );


    } else {

      newCart = [

        ...currentUserCart,

        {

          ...product,

          quantity:
            requestedQuantity,

        },

      ];

    }


    setCart(
      newCart
    );


    saveCartForUser(
      newCart,
      currentUser
    );


    setPageBeforeCart(
      pageRef.current
    );


    navigateTo(
      "cart"
    );

  };


  /* =========================================
     QUANTITÉ +
  ========================================= */

  const handleIncreaseQuantity =
    (product) => {

      const currentUser =
        getCurrentUser();


      if (!currentUser) {

        setCart([]);

        setShowAccountPopup(
          true
        );

        return;

      }


      setCart(
        (previousCart) => {

          const newCart =
            previousCart.map(
              (item) => {

                if (
                  item.id ===
                  product.id
                ) {

                  return {

                    ...item,

                    quantity:
                      (
                        Number(
                          item.quantity
                        ) || 1
                      ) + 1,

                  };

                }


                return item;

              }
            );


          saveCartForUser(
            newCart,
            currentUser
          );


          return newCart;

        }
      );

    };


  /* =========================================
     QUANTITÉ -
  ========================================= */

  const handleDecreaseQuantity =
    (product) => {

      const currentUser =
        getCurrentUser();


      if (!currentUser) {

        setCart([]);

        setShowAccountPopup(
          true
        );

        return;

      }


      setCart(
        (previousCart) => {

          const newCart =
            previousCart.map(
              (item) => {

                if (
                  item.id ===
                  product.id
                ) {

                  return {

                    ...item,

                    quantity:
                      Math.max(
                        1,
                        (
                          Number(
                            item.quantity
                          ) || 1
                        ) - 1
                      ),

                  };

                }


                return item;

              }
            );


          saveCartForUser(
            newCart,
            currentUser
          );


          return newCart;

        }
      );

    };


  /* =========================================
     SUPPRIMER DU PANIER
  ========================================= */

  const handleRemoveFromCart =
    (product) => {

      const currentUser =
        getCurrentUser();


      if (!currentUser) {

        setCart([]);

        return;

      }


      setCart(
        (previousCart) => {

          const newCart =
            previousCart.filter(
              (item) =>
                item.id !==
                product.id
            );


          saveCartForUser(
            newCart,
            currentUser
          );


          return newCart;

        }
      );

    };


  /* =========================================
     CONTINUER COMMANDE
  ========================================= */

  const handleContinueOrder =
    () => {

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
    () => {

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


  const handleOrder = (
    product
  ) => {

    handleAddToCart(
      product
    );

  };


  /* =========================================
     DÉCONNEXION
  ========================================= */

  const handleLogout = () => {

    setCart([]);


    localStorage.removeItem(
      "umiCurrentUser"
    );
    onUserChanged?.();


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


    pageHistoryRef.current = [];


    sessionStorage.removeItem(
      "umiPageHistory"
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

        <Home
          machines={
            machines
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
          onBack={
            goBack
          }

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
          onBack={
            goBack
          }

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
        />


        {renderAccountPopup()}

      </>

    );

  }


  /* =========================================
     DÉTAIL COMMERCE
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

          onBack={
            goBack
          }

          onAddToCart={
            handleAddToCart
          }

          onQuote={(product) =>
            handleOpenQuote({

              ...product,

              productType:
                selectedCommerceType,

            })
          }
        />


        {renderAccountPopup()}

      </>

    );

  }


  /* =========================================
     DEVIS CLIENT
  ========================================= */

  if (
    page === "quote"
  ) {

    return (

      <QuoteRequest
        user={
          getCurrentUser()
        }

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
     CHAT CLIENT
  ========================================= */

  if (
    page === "clientChat"
  ) {

    return (

      <ClientChat
        user={
          getCurrentUser()
        }

        onBack={
          goBack
        }
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
          cart={
            cart
          }

          user={
            getCurrentUser()
          }

          onBack={
            goBack
          }

          onConfirmOrder={
            handleOpenPayment
          }
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
          cart={
            cart
          }

          user={
            getCurrentUser()
          }

          onBack={
            goBack
          }
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
        orders={
          orders
        }

        onBack={
          goBack
        }

        onOpenOrder={(order) => {

          console.log(
            "Commande sélectionnée :",
            order
          );

        }}
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
        onBack={
          goBack
        }
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

        /* RETOUR */

        onBack={
          goBack
        }


        /* CRÉER LIVE */

        onCreateLive={() =>
          navigateTo(
            "createLive"
          )
        }


        /* PROGRAMMER LIVE */

        onScheduleLive={() =>
          navigateTo(
            "scheduleLive"
          )
        }


        /* REDIFFUSIONS */

        onOpenReplays={() =>
          navigateTo(
            "adminReplays"
          )
        }


        /* ACCUEIL */

        onHome={
          goToHome
        }


        /* PANIER */

        onOpenCart={() => {

          loadUserCart();


          setPageBeforeCart(
            "adminLive"
          );


          navigateTo(
            "cart"
          );

        }}


        /* DÉCONNEXION */

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
        onBack={
          goBack
        }

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


          goBack();

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

      <AdminQuotes
        onBack={
          goBack
        }
      />

    );

  }


  /* =========================================
     ADMIN CHAT
  ========================================= */

  if (
    page === "adminChat"
  ) {

    return (

      <AdminChat
        user={
          getCurrentUser()
        }

        onBack={
          goBack
        }
      />

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

  if (
    page === "adminDashboard"
  ) {

    return (

      <AdminDashboard

        onOpenMachines={() =>
          navigateTo(
            "adminMachines"
          )
        }

        onOpenAdminLive={() =>
          navigateTo(
            "adminLive"
          )
        }

        onOpenRawMaterials={() => {

          setSelectedProduct(
            null
          );


          navigateTo(
            "adminRawMaterials"
          );

        }}

        onOpenPackaging={() => {

          setSelectedProduct(
            null
          );


          navigateTo(
            "adminPackaging"
          );

        }}

        onOpenQuotes={() =>
          navigateTo(
            "adminQuotes"
          )
        }

        onOpenAdminChat={() =>
          navigateTo(
            "adminChat"
          )
        }

        onLogout={
          handleLogout
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


              if (alreadyExists) {

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


  if (
    goToPageAfterLogin()
  ) {

    return;

  }


  navigateTo(
    "home"
  );

}}

        onAdminLoginSuccess={() => {

  onUserChanged?.();

  loadUserCart();


  if (
    goToPageAfterLogin()
  ) {

    return;

  }


  navigateTo(
    "account"
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
          product={
            selectedProduct
          }

          onBack={
            goBack
          }

          onHome={
            goToHome
          }

          onOrder={
            handleOrder
          }

          onAddToCart={
            handleAddToCart
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

  if (
    page === "machines"
  ) {

    return (

      <Machines
        onBack={
          goBack
        }

        onOpenCategory={(category) => {

          setSelectedCategory(
            category
          );


          navigateTo(
            "machineCategory"
          );

        }}
      />

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
          onBack={
            goBack
          }

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
        />


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
      />

    );

  }


  /* =========================================
     MES LIVE CLIENT
  ========================================= */

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

        /* RETOUR */

        onBack={
          goBack
        }


        /* ACCUEIL */

        onHome={
          goToHome
        }


        /* PANIER */

        onOpenCart={() => {

          loadUserCart();


          setPageBeforeCart(
            "myClientLives"
          );


          navigateTo(
            "cart"
          );

        }}


        /* DÉCONNEXION */

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

        user={
          currentUser
        }


        /* RETOUR */

        onBack={
          goBack
        }


        /* ACCUEIL */

        onHome={
          goToHome
        }


        /* CATÉGORIES */

        onCategories={() => {

          setSelectedCategory(
            null
          );


          navigateTo(
            "machines"
          );

        }}


        /* MES COMMANDES */

        onOpenOrders={async () => {

          await loadUserOrders();


          navigateTo(
            "myOrders"
          );

        }}


        /* PANIER */

        onOpenCart={() => {

          loadUserCart();


          setPageBeforeCart(
            "account"
          );


          navigateTo(
            "cart"
          );

        }}


        /* ADMINISTRATION UMI */

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


        /* DÉCONNEXION */

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

}

/* =========================================
   APPLICATION GLOBALE
========================================= */

function App() {

  const [currentUser, setCurrentUser] = useState(() => {

    try {

      const savedUser = localStorage.getItem("umiCurrentUser");

      if (!savedUser) {
        return null;
      }

      return JSON.parse(savedUser);

    } catch (error) {

      console.error("Erreur utilisateur global :", error);
      return null;

    }

  });


  const refreshCurrentUser = () => {

    try {

      const savedUser = localStorage.getItem("umiCurrentUser");

      if (!savedUser) {
        setCurrentUser(null);
        return;
      }

      setCurrentUser(JSON.parse(savedUser));

    } catch (error) {

      console.error("Erreur actualisation utilisateur :", error);
      setCurrentUser(null);

    }

  };


  useEffect(() => {

    const handleStorageChange = () => {
      refreshCurrentUser();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };

  }, []);


  return (
    <>
      <AppContent
        onUserChanged={refreshCurrentUser}
      />

      {currentUser?.role === "admin" && (
        <AdminChatBubble
          user={currentUser}
        />
      )}
    </>
  );
}

export default App;
