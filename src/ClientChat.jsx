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
} from "firebase/firestore";

import { db } from "./firebase";

import "./CommerceModule.css";


function ClientChat({
  user,
  onBack,
}) {

  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const bottomRef =
    useRef(null);


  const userId =
    user?.userId || "";


  useEffect(() => {

    if (!userId) {
      return;
    }


    const messagesQuery =
      query(
        collection(
          db,
          "conversations",
          userId,
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


          setMessages(data);

        },
        (error) => {

          console.error(
            "Erreur chat :",
            error
          );

        }
      );


    return () =>
      unsubscribe();

  }, [userId]);


  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages]);


  const sendMessage = async (event) => {

    event.preventDefault();


    const cleanText =
      text.trim();


    if (!cleanText || !userId) {
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
            user?.email || "",

          lastMessage:
            cleanText,

          lastSender:
            "client",

          status:
            "Ouverte",

          unreadAdmin:
            true,

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


      alert(
        "Impossible d'envoyer le message."
      );


    } finally {

      setSending(false);

    }

  };


  return (

    <div className="chat-page">

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


      <main className="chat-messages">

        <div className="chat-welcome">

          <span>💬</span>

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


      <form
        className="chat-compose"
        onSubmit={sendMessage}
      >

        <input
          type="text"
          value={text}
          onChange={(event) =>
            setText(event.target.value)
          }
          placeholder="Écrivez votre message..."
        />


        <button
          type="submit"
          disabled={
            sending ||
            !text.trim()
          }
        >
          ➤
        </button>

      </form>

    </div>

  );

}


export default ClientChat;