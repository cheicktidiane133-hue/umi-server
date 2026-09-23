import { useEffect, useState } from "react";

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

import "./AdminChat.css";


function AdminChat({ user, onBack }) {

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);


  /* =========================================
     CHARGER LES CONVERSATIONS
  ========================================= */

  useEffect(() => {

    const conversationsQuery = query(
      collection(db, "conversations"),
      orderBy("updatedAt", "desc")
    );


    const unsubscribe = onSnapshot(
      conversationsQuery,

      (snapshot) => {

        const data = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setConversations(data);
        setLoadingConversations(false);


        /*
          Si une conversation est déjà ouverte,
          on actualise aussi ses informations.
        */

        setSelectedConversation(
          (previous) => {

            if (!previous) {
              return previous;
            }

            const updatedConversation =
              data.find(
                (item) =>
                  item.id === previous.id
              );

            return (
              updatedConversation ||
              previous
            );

          }
        );

      },

      (error) => {

        console.error(
          "Erreur chargement conversations :",
          error
        );

        setLoadingConversations(false);

      }
    );


    return () => unsubscribe();

  }, []);


  /* =========================================
     CHARGER LES MESSAGES
  ========================================= */

  useEffect(() => {

    if (!selectedConversation?.id) {

      setMessages([]);
      return;

    }


    setLoadingMessages(true);


    const messagesQuery = query(
      collection(
        db,
        "conversations",
        selectedConversation.id,
        "messages"
      ),
      orderBy("createdAt", "asc")
    );


    const unsubscribe = onSnapshot(
      messagesQuery,

      (snapshot) => {

        const data = snapshot.docs.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        );

        setMessages(data);
        setLoadingMessages(false);

      },

      (error) => {

        console.error(
          "Erreur chargement messages :",
          error
        );

        setLoadingMessages(false);

      }
    );


    return () => unsubscribe();

  }, [selectedConversation?.id]);


  /* =========================================
     OUVRIR UNE CONVERSATION
  ========================================= */

  const handleOpenConversation = async (
    conversation
  ) => {

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
          unreadAdmin: false,
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
     RETOUR LISTE DES CONVERSATIONS
  ========================================= */

  const handleCloseConversation = () => {

    setSelectedConversation(null);
    setMessages([]);
    setMessage("");

  };


  /* =========================================
     ENVOYER MESSAGE ADMIN
  ========================================= */

  const handleSendMessage = async (
    event
  ) => {

    event?.preventDefault();


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

      setSending(true);


      const conversationId =
        selectedConversation.id;


      /*
        Mise à jour de la conversation
      */

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


      /*
        Ajout du message
      */

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
        "Erreur envoi message admin :",
        error
      );


      alert(
        "Impossible d'envoyer le message."
      );


    } finally {

      setSending(false);

    }

  };


  /* =========================================
     FORMAT DATE
  ========================================= */

  const formatTime = (value) => {

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
     INITIAL CLIENT
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


  return (

    <div className="admin-chat-page">


      {/* =====================================
          LISTE DES CONVERSATIONS
      ===================================== */}

      <section
        className={`admin-chat-sidebar ${
          selectedConversation
            ? "conversation-open"
            : ""
        }`}
      >


        <header className="admin-chat-header">

          <button
            type="button"
            className="admin-chat-back"
            onClick={onBack}
          >
            ←
          </button>


          <div>

            <h1>
              Messages clients
            </h1>

            <p>
              Administration UMI
            </p>

          </div>


          <span className="admin-chat-header-icon">
            💬
          </span>

        </header>


        <div className="admin-chat-sidebar-content">


          <div className="admin-chat-intro">

            <div>

              <span>
                CONVERSATIONS
              </span>

              <h2>
                Boîte de réception
              </h2>

            </div>


            <strong>
              {
                conversations.filter(
                  (conversation) =>
                    conversation.unreadAdmin
                ).length
              }
            </strong>

          </div>


          {loadingConversations ? (

            <div className="admin-chat-empty">
              Chargement...
            </div>

          ) : conversations.length === 0 ? (

            <div className="admin-chat-empty">

              <span>
                💬
              </span>

              <h3>
                Aucun message
              </h3>

              <p>
                Les conversations des clients
                apparaîtront ici.
              </p>

            </div>

          ) : (

            <div className="admin-chat-conversations">


              {conversations.map(
                (conversation) => (

                  <button
                    type="button"
                    key={conversation.id}
                    className={`admin-chat-conversation ${
                      selectedConversation?.id ===
                      conversation.id
                        ? "active"
                        : ""
                    } ${
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


                    <div className="admin-chat-avatar">

                      {getClientInitial(
                        conversation
                      )}

                    </div>


                    <div className="admin-chat-conversation-info">

                      <div className="admin-chat-conversation-top">

                        <strong>
                          {conversation.clientName ||
                            "Client UMI"}
                        </strong>

                        <span>
                          {formatConversationDate(
                            conversation.updatedAt
                          )}
                        </span>

                      </div>


                      <div className="admin-chat-conversation-bottom">

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
              )}


            </div>

          )}


        </div>

      </section>


      {/* =====================================
          CONVERSATION OUVERTE
      ===================================== */}

      <section
        className={`admin-chat-conversation-panel ${
          selectedConversation
            ? "open"
            : ""
        }`}
      >


        {!selectedConversation ? (

          <div className="admin-chat-no-selection">

            <span>
              💬
            </span>

            <h2>
              Messages UMI
            </h2>

            <p>
              Sélectionnez une conversation
              pour répondre au client.
            </p>

          </div>

        ) : (

          <>


            {/* HEADER CONVERSATION */}

            <header className="admin-chat-conversation-header">

              <button
                type="button"
                className="admin-chat-mobile-back"
                onClick={
                  handleCloseConversation
                }
              >
                ←
              </button>


              <div className="admin-chat-small-avatar">

                {getClientInitial(
                  selectedConversation
                )}

              </div>


              <div className="admin-chat-client-title">

                <h2>
                  {selectedConversation.clientName ||
                    "Client UMI"}
                </h2>

                <p>
                  {selectedConversation.clientEmail ||
                    "Conversation client"}
                </p>

              </div>


              <span className="admin-chat-online">
                ●
              </span>

            </header>


            {/* MESSAGES */}

            <div className="admin-chat-messages">


              <div className="admin-chat-welcome">

                <span>
                  UMI
                </span>

                <strong>
                  Conversation client
                </strong>

                <p>
                  Vous pouvez répondre directement
                  à cette demande.
                </p>

              </div>


              {loadingMessages ? (

                <div className="admin-chat-loading">
                  Chargement...
                </div>

              ) : messages.length === 0 ? (

                <div className="admin-chat-loading">
                  Aucun message.
                </div>

              ) : (

                messages.map(
                  (item) => {

                    const isAdmin =
                      item.sender ===
                      "admin";


                    return (

                      <div
                        key={item.id}
                        className={`admin-chat-message-row ${
                          isAdmin
                            ? "admin"
                            : "client"
                        }`}
                      >

                        <div
                          className={`admin-chat-message ${
                            isAdmin
                              ? "admin"
                              : "client"
                          }`}
                        >

                          <p>
                            {item.text}
                          </p>

                          <span>
                            {formatTime(
                              item.createdAt
                            )}
                          </span>

                        </div>

                      </div>

                    );

                  }
                )

              )}


            </div>


            {/* ZONE ÉCRITURE */}

            <form
              className="admin-chat-compose"
              onSubmit={
                handleSendMessage
              }
            >

              <textarea
                rows="1"
                value={message}
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


      </section>


    </div>

  );

}


export default AdminChat;