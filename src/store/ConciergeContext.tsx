import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

export type ChatMessage = {
  id: string;
  userLogin: string;
  author: "user" | "admin";
  text: string;
  createdAt?: any;
  readByUser?: boolean;
};

type ConciergeContextType = {
  messages: ChatMessage[];

  sendUserMessage: (
    userLogin: string,
    text: string
  ) => Promise<void>;

  sendAdminMessage: (
    userLogin: string,
    text: string
  ) => Promise<void>;

  markMessagesAsRead: (
    userLogin: string
  ) => Promise<void>;
};

const ConciergeContext =
  createContext<ConciergeContextType | null>(null);

export function ConciergeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "messages"),
      (snapshot) => {
        const list: ChatMessage[] =
          snapshot.docs.map((messageDoc) => ({
            id: messageDoc.id,
            ...(messageDoc.data() as Omit<
              ChatMessage,
              "id"
            >),
          }));

        list.sort((a, b) => {
          const timeA =
            a.createdAt?.seconds ?? 0;

          const timeB =
            b.createdAt?.seconds ?? 0;

          return timeA - timeB;
        });

        setMessages(list);
      },
      (error) => {
        console.error(
          "Ошибка realtime Concierge:",
          error
        );
      }
    );

    return unsubscribe;
  }, []);

  async function sendUserMessage(
    userLogin: string,
    text: string
  ) {
    await addDoc(collection(db, "messages"), {
      userLogin,
      author: "user",
      text,
      createdAt: serverTimestamp(),

      // Сообщение пользователя уже прочитано самим пользователем
      readByUser: true,
    });
  }

  async function sendAdminMessage(
    userLogin: string,
    text: string
  ) {
    await addDoc(collection(db, "messages"), {
      userLogin,
      author: "admin",
      text,
      createdAt: serverTimestamp(),

      // Пользователь ещё не прочитал сообщение
      readByUser: false,
    });
  }

  async function markMessagesAsRead(
    userLogin: string
  ) {
    const unreadMessages = messages.filter(
      (message) =>
        message.userLogin === userLogin &&
        message.author === "admin" &&
        message.readByUser !== true
    );

    if (unreadMessages.length === 0) {
      return;
    }

    await Promise.all(
      unreadMessages.map((message) =>
        updateDoc(
          doc(db, "messages", message.id),
          {
            readByUser: true,
          }
        )
      )
    );
  }

  return (
    <ConciergeContext.Provider
      value={{
        messages,
        sendUserMessage,
        sendAdminMessage,
        markMessagesAsRead,
      }}
    >
      {children}
    </ConciergeContext.Provider>
  );
}

export function useConcierge() {
  const context =
    useContext(ConciergeContext);

  if (!context) {
    throw new Error(
      "useConcierge должен использоваться внутри ConciergeProvider"
    );
  }

  return context;
}