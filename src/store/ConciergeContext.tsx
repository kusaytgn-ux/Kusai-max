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

  /*
   * REALTIME ЗАГРУЗКА СООБЩЕНИЙ
   */
  useEffect(() => {
    const messagesRef = collection(db, "messages");

    const unsubscribe = onSnapshot(
      messagesRef,
      (snapshot) => {
        const list: ChatMessage[] =
          snapshot.docs.map((messageDoc) => ({
            id: messageDoc.id,
            ...(messageDoc.data() as Omit<
              ChatMessage,
              "id"
            >),
          }));

        /*
         * Сортируем сообщения по времени.
         *
         * Важный момент:
         * serverTimestamp() при создании документа
         * некоторое время может быть null.
         *
         * Поэтому сообщение всё равно добавляется
         * в список сразу, даже если timestamp ещё
         * не пришёл от Firebase.
         */
        list.sort((a, b) => {
          const timeA =
            a.createdAt?.toMillis?.() ??
            (a.createdAt?.seconds
              ? a.createdAt.seconds * 1000
              : 0);

          const timeB =
            b.createdAt?.toMillis?.() ??
            (b.createdAt?.seconds
              ? b.createdAt.seconds * 1000
              : 0);

          /*
           * Если Firebase ещё не установил timestamp,
           * сохраняем стабильный порядок.
           */
          if (timeA === timeB) {
            return a.id.localeCompare(b.id);
          }

          return timeA - timeB;
        });

        setMessages(list);
      },
      (error) => {
        console.error(
          "Ошибка realtime-загрузки сообщений:",
          error
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /*
   * ПОЛЬЗОВАТЕЛЬ ОТПРАВЛЯЕТ СООБЩЕНИЕ
   */
  async function sendUserMessage(
    userLogin: string,
    text: string
  ) {
    const cleanText = text.trim();

    if (!cleanText) return;

    await addDoc(
      collection(db, "messages"),
      {
        userLogin,
        author: "user",
        text: cleanText,

        /*
         * Пользователь своё сообщение уже прочитал.
         * Для администратора оно является новым.
         */
        readByUser: true,

        createdAt: serverTimestamp(),
      }
    );
  }

  /*
   * АДМИНИСТРАТОР ОТПРАВЛЯЕТ СООБЩЕНИЕ
   */
  async function sendAdminMessage(
    userLogin: string,
    text: string
  ) {
    const cleanText = text.trim();

    if (!cleanText) return;

    await addDoc(
      collection(db, "messages"),
      {
        userLogin,
        author: "admin",
        text: cleanText,

        /*
         * Для пользователя сообщение новое.
         */
        readByUser: false,

        createdAt: serverTimestamp(),
      }
    );
  }

  /*
   * ПОМЕТИТЬ СООБЩЕНИЯ АДМИНИСТРАТОРА
   * КАК ПРОЧИТАННЫЕ ПОЛЬЗОВАТЕЛЕМ
   */
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