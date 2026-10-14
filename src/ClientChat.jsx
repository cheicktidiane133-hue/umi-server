import { umiAlert as umiNotify, umiConfirm as umiAsk } from "./umiDialogs";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./CommerceModule.css";


function ClientChat({
  user,
  userPhoto,
  onBack,
  embedded = false,

  /* BARRE DES TÂCHES */
  onHome,
  onMachines,
  onLive,
  onCart,
  onAccount,
}) {

  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const bottomRef =
    useRef(null);
const messagesRef = useRef(null);

  const userId =
    user?.userId ||
    user?.uid ||
    "";


  /* =========================================
   CHARGER LES MESSAGES
   ET MARQUER L’ASSISTANCE OUVERTE COMME LUE
========================================= */

useEffect(() => {
  if (!userId) {
    setMessages([]);
    return;
  }

  const conversationRef = doc(
    db,
    "conversations",
    userId
  );

  const messagesQuery = query(
    collection(
      db,
      "conversations",
      userId,
      "messages"
    ),
    orderBy("createdAt", "asc")
  );

  const unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      const data = snapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data(),
        })
      );

      setMessages(data);
    },
    (error) => {
      console.error(
        "Erreur chargement chat client :",
        error
      );
    }
  );

  /* Remet le compteur client à zéro
     lorsque l’assistance est ouverte. */

  const unsubscribeRead = onSnapshot(
    conversationRef,
    (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();

      const hasUnreadMessages =
        data.unreadClient === true ||
        Number(data.unreadClientCount || 0) > 0;

      if (!hasUnreadMessages) return;

      setDoc(
        conversationRef,
        {
          unreadClient: false,
          unreadClientCount: 0,
        },
        {
          merge: true,
        }
      ).catch((error) => {
        console.error(
          "Erreur lecture automatique chat client :",
          error
        );
      });
    },
    (error) => {
      console.error(
        "Erreur suivi assistance client :",
        error
      );
    }
  );

  return () => {
    unsubscribeMessages();
    unsubscribeRead();
  };
}, [userId]);
  /* =========================================
     DESCENDRE AU DERNIER MESSAGE
  ========================================= */

 useEffect(() => {
  if (embedded) {
    const container = messagesRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }

    return;
  }

  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages, embedded]);


  /* =========================================
     ENVOYER MESSAGE
  ========================================= */

  const sendMessage =
    async (event) => {

      event.preventDefault();


      const cleanText =
        text.trim();


      if (
        !cleanText ||
        !userId
      ) {
        return;
      }


      try {

        setSending(true);


        const conversationRef =
          doc(
            db,
            "conversations",
            userId
          );


        await setDoc(
          conversationRef,
          {
            userId,

            clientName:
              user?.nom ||
              user?.name ||
              "Client",

            clientEmail:
              user?.email ||
              "",

            lastMessage:
              cleanText,

            lastSender:
              "client",

            status:
              "Ouverte",

            unreadAdmin:
  true,

unreadAdminCount:
  increment(1),

updatedAt:
  serverTimestamp(),
          },
          {
            merge: true,
          }
        );


        await addDoc(
          collection(
            db,
            "conversations",
            userId,
            "messages"
          ),
          {
            text:
              cleanText,

            sender:
              "client",

            senderId:
              userId,

            createdAt:
              serverTimestamp(),

            read:
              false,
          }
        );


        setText("");


      } catch (error) {

        console.error(
          "Erreur envoi message :",
          error
        );


        await umiNotify(
          "Impossible d'envoyer le message."
        );


      } finally {

        setSending(false);

      }

    };


  /* =========================================
     AFFICHAGE
  ========================================= */

  return (

    <div className="chat-page">


      {/* =====================================
    EN-TÊTE
===================================== */}

{!embedded && (

  <header className="chat-header">

    <button
      type="button"
      onClick={onBack}
    >
      ←
    </button>

    <div>

      <h1>
        Assistance UMI
      </h1>

      <p>
        Chat avec l'administration
      </p>

    </div>

    <div className="chat-online">
      ●
    </div>

  </header>

)}

      {/* =====================================
          MESSAGES
      ===================================== */}

      <main
  className="chat-messages"
  ref={messagesRef}
>

        <div className="chat-welcome">

          <span>
            💬
          </span>

          <h3>
            Bienvenue sur l'assistance UMI
          </h3>

          <p>
            Posez votre question concernant
            une machine, une commande,
            un devis, une matière première
            ou un emballage.
          </p>

        </div>


        {messages.map(
          (message) => (

            <div
              key={message.id}
              className={
                message.sender === "client"
                  ? "chat-row client"
                  : "chat-row admin"
              }
            >

              <div className="chat-bubble">

                {message.sender === "admin" && (

                  <strong>
                    UMI
                  </strong>

                )}


                <p>
                  {message.text}
                </p>

              </div>

            </div>

          )
        )}


        <div ref={bottomRef} />

      </main>


      {/* =====================================
          ZONE ÉCRITURE
      ===================================== */}
      {/* =========================================
          ZONE ÉCRITURE
      ========================================= */}

      <form
        className="chat-compose"
        onSubmit={sendMessage}
      >

        <input
          type="text"
          value={text}
          onChange={(event) =>
            setText(
              event.target.value
            )
          }
          placeholder="Écrivez votre message..."
        />

        <button
  type="submit"
  className="chat-compose-send-button"
  disabled={
    sending ||
    !text.trim()
  }
>
  ➤
</button>
      </form>


      {/* =========================================
          BARRE DES TÂCHES CLIENT
      ========================================= */}

      {!embedded && (

        <nav className="commerce-bottom-nav chat-bottom-nav">


          {/* ACCUEIL */}

          <button
            type="button"
            className="commerce-bottom-nav-item"
            onClick={onHome}
          >

            <span className="commerce-bottom-nav-icon">
              🏠
            </span>

            <span>
              Accueil
            </span>

          </button>


          {/* MACHINES */}

          <button
            type="button"
            className="commerce-bottom-nav-item"
            onClick={onMachines}
          >

            <span className="commerce-bottom-nav-icon">
              ⚙️
            </span>

            <span>
              Machines
            </span>

          </button>


          {/* UMI LIVE */}

          <button
            type="button"
            className="commerce-bottom-nav-item"
            onClick={onLive}
          >

            <span
              className="
                commerce-bottom-nav-icon
                commerce-live-nav-icon
              "
            >
              ▶
            </span>

            <span>
              UMI LIVE
            </span>

          </button>


          {/* PANIER */}

          <button
            type="button"
            className="commerce-bottom-nav-item"
            onClick={onCart}
          >

            <span className="commerce-bottom-nav-icon">
              🛒
            </span>

            <span>
              Panier
            </span>

          </button>


          {/* COMPTE */}

          <button
            type="button"
            className="commerce-bottom-nav-item"
            onClick={onAccount}
          >

            <span className="commerce-account-nav-photo-wrapper">

              {userPhoto ? (

                <img
                  src={userPhoto}
                  alt="Compte"
                  className="commerce-account-nav-photo"
                />

              ) : (

                <span className="commerce-account-nav-placeholder">
                  👤
                </span>

              )}

            </span>

            <span>
              Compte
            </span>

          </button>

        </nav>

      )}

    </div>

  );

}


export default ClientChat;