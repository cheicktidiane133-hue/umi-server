import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

import "./AdminChatBubble.css";


function AdminChatBubble({ user }) {

  const [isOpen, setIsOpen] =
    useState(false);

  const [conversations, setConversations] =
    useState([]);

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState(null);

  const [messages, setMessages] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const bottomRef =
    useRef(null);


  /* =========================================
     VÉRIFIER ADMIN
  ========================================= */

  const isAdmin =
    user?.role === "admin";


  /* =========================================
     CHARGER LES CONVERSATIONS
  ========================================= */

  useEffect(() => {

    if (!isAdmin) {

      setConversations([]);

      return;

    }


    const conversationsQuery =
      query(
        collection(
          db,
          "conversations"
        ),
        orderBy(
          "updatedAt",
          "desc"
        )
      );


    const unsubscribe =
      onSnapshot(

        conversationsQuery,

        (snapshot) => {

          const data =
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );


          setConversations(
            data
          );


          setSelectedConversation(
            (previous) => {

              if (!previous) {

                return previous;

              }


              const updated =
                data.find(
                  (conversation) =>
                    conversation.id ===
                    previous.id
                );


              return (
                updated ||
                previous
              );

            }
          );

        },

        (error) => {

          console.error(
            "Erreur bulle chat admin :",
            error
          );

        }

      );


    return () => {

      unsubscribe();

    };

  }, [isAdmin]);


  /* =========================================
     NOMBRE DE CONVERSATIONS NON LUES
  ========================================= */

  const unreadCount =
    conversations.filter(
      (conversation) =>
        conversation.unreadAdmin === true
    ).length;


  /* =========================================
     CHARGER LES MESSAGES
  ========================================= */

  useEffect(() => {

    if (
      !isAdmin ||
      !selectedConversation?.id
    ) {

      setMessages([]);

      return;

    }


    setLoadingMessages(
      true
    );


    const messagesQuery =
      query(
        collection(
          db,
          "conversations",
          selectedConversation.id,
          "messages"
        ),
        orderBy(
          "createdAt",
          "asc"
        )
      );


    const unsubscribe =
      onSnapshot(

        messagesQuery,

        (snapshot) => {

          const data =
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );


          setMessages(
            data
          );


          setLoadingMessages(
            false
          );

        },

        (error) => {

          console.error(
            "Erreur messages bulle admin :",
            error
          );


          setLoadingMessages(
            false
          );

        }

      );


    return () => {

      unsubscribe();

    };

  }, [
    isAdmin,
    selectedConversation?.id,
  ]);


  /* =========================================
     DESCENDRE AUTOMATIQUEMENT
  ========================================= */

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages]);


  /* =========================================
     OUVRIR LA BULLE
  ========================================= */

  const handleToggleBubble = () => {

    setIsOpen(
      (previous) =>
        !previous
    );

  };


  /* =========================================
     FERMER LA FENÊTRE
  ========================================= */

  const handleClose = () => {

    setIsOpen(false);

  };


  /* =========================================
     OUVRIR UNE CONVERSATION
  ========================================= */

  const handleOpenConversation =
    async (conversation) => {

      setSelectedConversation(
        conversation
      );


      try {

        await updateDoc(
          doc(
            db,
            "conversations",
            conversation.id
          ),
          {
            unreadAdmin:
              false,
          }
        );


      } catch (error) {

        console.error(
          "Erreur lecture conversation :",
          error
        );

      }

    };


  /* =========================================
     RETOUR À LA LISTE
  ========================================= */

  const handleBackToList = () => {

    setSelectedConversation(
      null
    );

    setMessages([]);

    setMessage("");

  };


  /* =========================================
     ENVOYER RÉPONSE ADMIN
  ========================================= */

  const handleSendMessage =
    async (event) => {

      event.preventDefault();


      const cleanMessage =
        message.trim();


      if (
        !cleanMessage ||
        !selectedConversation?.id ||
        sending
      ) {

        return;

      }


      try {

        setSending(
          true
        );


        const conversationId =
          selectedConversation.id;


        /* =====================================
           METTRE À JOUR CONVERSATION
        ===================================== */

        await setDoc(
          doc(
            db,
            "conversations",
            conversationId
          ),
          {
            userId:
              selectedConversation.userId ||
              conversationId,

            clientName:
              selectedConversation.clientName ||
              "Client UMI",

            clientEmail:
              selectedConversation.clientEmail ||
              "",

            lastMessage:
              cleanMessage,

            lastSender:
              "admin",

            status:
              "Ouverte",

            unreadAdmin:
              false,

            unreadClient:
              true,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );


        /* =====================================
           AJOUTER MESSAGE
        ===================================== */

        await addDoc(
          collection(
            db,
            "conversations",
            conversationId,
            "messages"
          ),
          {
            text:
              cleanMessage,

            sender:
              "admin",

            senderId:
              user?.userId ||
              "admin",

            createdAt:
              serverTimestamp(),

            read:
              false,
          }
        );


        setMessage("");


      } catch (error) {

        console.error(
          "Erreur réponse admin :",
          error
        );


        alert(
          "Impossible d'envoyer le message."
        );


      } finally {

        setSending(
          false
        );

      }

    };


  /* =========================================
     HEURE MESSAGE
  ========================================= */

  const formatTime = (
    value
  ) => {

    if (!value) {

      return "";

    }


    try {

      const date =
        typeof value?.toDate ===
        "function"
          ? value.toDate()
          : new Date(value);


      return date.toLocaleTimeString(
        "fr-FR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );


    } catch {

      return "";

    }

  };


  /* =========================================
     DATE CONVERSATION
  ========================================= */

  const formatConversationDate = (
    value
  ) => {

    if (!value) {

      return "";

    }


    try {

      const date =
        typeof value?.toDate ===
        "function"
          ? value.toDate()
          : new Date(value);


      const today =
        new Date();


      const sameDay =
        date.getDate() ===
          today.getDate() &&
        date.getMonth() ===
          today.getMonth() &&
        date.getFullYear() ===
          today.getFullYear();


      if (sameDay) {

        return date.toLocaleTimeString(
          "fr-FR",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );

      }


      return date.toLocaleDateString(
        "fr-FR",
        {
          day: "2-digit",
          month: "2-digit",
        }
      );


    } catch {

      return "";

    }

  };


  /* =========================================
     INITIAL DU CLIENT
  ========================================= */

  const getClientInitial = (
    conversation
  ) => {

    return (
      conversation?.clientName
        ?.trim()
        ?.charAt(0)
        ?.toUpperCase() ||
      "C"
    );

  };


  /* =========================================
     PAS ADMIN = PAS DE BULLE
  ========================================= */

  if (!isAdmin) {

    return null;

  }


  return (

    <>


      {/* =====================================
          FENÊTRE CHAT FLOTTANTE
      ===================================== */}

      {isOpen && (

        <div className="admin-floating-chat-window">


          {/* =================================
              LISTE CONVERSATIONS
          ================================= */}

          {!selectedConversation ? (

            <>

              <header className="admin-floating-header">

                <div>

                  <strong>
                    Messages clients
                  </strong>

                  <span>
                    Administration UMI
                  </span>

                </div>


                <button
                  type="button"
                  onClick={
                    handleClose
                  }
                >
                  ×
                </button>

              </header>


              <div className="admin-floating-conversation-title">

                <span>
                  Conversations
                </span>


                {unreadCount > 0 && (

                  <strong>
                    {unreadCount}
                  </strong>

                )}

              </div>


              <div className="admin-floating-conversations">


                {conversations.length ===
                0 ? (

                  <div className="admin-floating-empty">

                    <span>
                      💬
                    </span>

                    <p>
                      Aucun message client.
                    </p>

                  </div>

                ) : (

                  conversations.map(
                    (conversation) => (

                      <button
                        type="button"
                        key={
                          conversation.id
                        }
                        className={`admin-floating-conversation ${
                          conversation.unreadAdmin
                            ? "unread"
                            : ""
                        }`}
                        onClick={() =>
                          handleOpenConversation(
                            conversation
                          )
                        }
                      >

                        <div className="admin-floating-avatar">

                          {getClientInitial(
                            conversation
                          )}

                        </div>


                        <div className="admin-floating-conversation-info">

                          <div className="admin-floating-conversation-name">

                            <strong>

                              {conversation.clientName ||
                                "Client UMI"}

                            </strong>


                            <small>

                              {formatConversationDate(
                                conversation.updatedAt
                              )}

                            </small>

                          </div>


                          <div className="admin-floating-last-message">

                            <p>

                              {conversation.lastSender ===
                                "admin" && (
                                <span>
                                  Vous :{" "}
                                </span>
                              )}


                              {conversation.lastMessage ||
                                "Nouvelle conversation"}

                            </p>


                            {conversation.unreadAdmin && (

                              <i />

                            )}

                          </div>

                        </div>

                      </button>

                    )
                  )

                )}

              </div>

            </>

          ) : (

            <>


              {/* ===============================
                  HEADER CONVERSATION
              =============================== */}

              <header className="admin-floating-chat-header">

                <button
                  type="button"
                  className="admin-floating-back"
                  onClick={
                    handleBackToList
                  }
                >
                  ←
                </button>


                <div className="admin-floating-small-avatar">

                  {getClientInitial(
                    selectedConversation
                  )}

                </div>


                <div className="admin-floating-client">

                  <strong>

                    {selectedConversation.clientName ||
                      "Client UMI"}

                  </strong>


                  <span>

                    {selectedConversation.clientEmail ||
                      "Client UMI"}

                  </span>

                </div>


                <button
                  type="button"
                  className="admin-floating-close"
                  onClick={
                    handleClose
                  }
                >
                  ×
                </button>

              </header>


              {/* ===============================
                  MESSAGES
              =============================== */}

              <div className="admin-floating-messages">


                {loadingMessages ? (

                  <div className="admin-floating-loading">

                    Chargement...

                  </div>

                ) : messages.length ===
                  0 ? (

                  <div className="admin-floating-empty">

                    <p>
                      Aucun message.
                    </p>

                  </div>

                ) : (

                  messages.map(
                    (item) => {

                      const adminMessage =
                        item.sender ===
                        "admin";


                      return (

                        <div
                          key={
                            item.id
                          }
                          className={`admin-floating-message-row ${
                            adminMessage
                              ? "admin"
                              : "client"
                          }`}
                        >

                          <div
                            className={`admin-floating-message ${
                              adminMessage
                                ? "admin"
                                : "client"
                            }`}
                          >

                            <p>
                              {item.text}
                            </p>


                            <small>

                              {formatTime(
                                item.createdAt
                              )}

                            </small>

                          </div>

                        </div>

                      );

                    }
                  )

                )}


                <div
                  ref={
                    bottomRef
                  }
                />

              </div>


              {/* ===============================
                  RÉPONSE
              =============================== */}

              <form
                className="admin-floating-compose"
                onSubmit={
                  handleSendMessage
                }
              >

                <textarea
                  rows="1"
                  value={
                    message
                  }
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  placeholder="Écrire une réponse..."
                />


                <button
                  type="submit"
                  disabled={
                    !message.trim() ||
                    sending
                  }
                >

                  {sending
                    ? "..."
                    : "➤"}

                </button>

              </form>

            </>

          )}

        </div>

      )}


      {/* =====================================
          BULLE
      ===================================== */}

      <button
        type="button"
        className={`admin-floating-chat-button ${
          unreadCount > 0
            ? "has-unread"
            : ""
        }`}
        onClick={
          handleToggleBubble
        }
        aria-label="Messages clients"
      >

        {isOpen
          ? "×"
          : "💬"}


        {!isOpen &&
          unreadCount > 0 && (

            <span className="admin-floating-badge">

              {unreadCount > 99
                ? "99+"
                : unreadCount}

            </span>

          )}

      </button>

    </>

  );

}


export default AdminChatBubble;