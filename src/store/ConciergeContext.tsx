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
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

export type ChatMessage = {
  id: string;
  userLogin: string;
  author: "user" | "admin";
  text: string;
  createdAt?: any;

  // Прочитано пользователем
  readByUser?: boolean;

  // Прочитано администратором
  readByAdmin?: boolean;
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

  markAdminMessagesAsRead: (
    userLogin: string
  ) => Promise<void>;

  deleteUserChat: (
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
   * REALTIME ЗАГРУЗКА ВСЕХ СООБЩЕНИЙ
   */
  useEffect(() => {
    const messagesRef = collection(db, "messages");

    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
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
         * Если createdAt временно null из-за
         * serverTimestamp(), сортировка всё равно
         * не ломается.
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

          if (timeA === timeB) {
            return a.id.localeCompare(b.id);
          }

          return timeA - timeB;
        });

        setMessages(list);
      },
      (error) => {
        console.error(
          "Ошибка realtime-загрузки Concierge:",
          error
        );
      }
    );

    return () => unsubscribe();
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

        // Пользователь своё сообщение прочитал
        readByUser: true,

        // Администратор ещё не прочитал
        readByAdmin: false,

        createdAt: serverTimestamp(),
      }
    );
  }

  /*
   * АДМИНИСТРАТОР ОТПРАВЛЯЕТ СООБЩЕНИЕ
   *
   * Администратор может написать первым.
   * Для этого пользователь должен просто
   * существовать в поле userLogin.
   */
  async function sendAdminMessage(
    userLogin: string,
    text: string
  ) {
    const cleanText = text.trim();

    if (!cleanText || !userLogin.trim()) {
      return;
    }

    await addDoc(
      collection(db, "messages"),
      {
        userLogin: userLogin.trim(),
        author: "admin",
        text: cleanText,

        // Для пользователя сообщение новое
        readByUser: false,

        // Администратор только что его отправил
        readByAdmin: true,

        createdAt: serverTimestamp(),
      }
    );
  }

  /*
   * ПОЛЬЗОВАТЕЛЬ ПРОЧИТАЛ СООБЩЕНИЯ АДМИНА
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

  /*
   * АДМИНИСТРАТОР ПРОЧИТАЛ СООБЩЕНИЯ ПОЛЬЗОВАТЕЛЯ
   */
  async function markAdminMessagesAsRead(
    userLogin: string
  ) {
    const unreadMessages = messages.filter(
      (message) =>
        message.userLogin === userLogin &&
        message.author === "user" &&
        message.readByAdmin !== true
    );

    if (unreadMessages.length === 0) {
      return;
    }

    await Promise.all(
      unreadMessages.map((message) =>
        updateDoc(
          doc(db, "messages", message.id),
          {
            readByAdmin: true,
          }
        )
      )
    );
  }

  /*
   * УДАЛЕНИЕ ВСЕГО ЧАТА ПОЛЬЗОВАТЕЛЯ
   */
  async function deleteUserChat(
    userLogin: string
  ) {
    const userMessages = messages.filter(
      (message) =>
        message.userLogin === userLogin
    );

    if (userMessages.length === 0) {
      return;
    }

    /*
     * Используем batch, чтобы удалить все
     * сообщения одного пользователя.
     */
    const batch = writeBatch(db);

    userMessages.forEach((message) => {
      batch.delete(
        doc(db, "messages", message.id)
      );
    });

    await batch.commit();
  }

  return (
    <ConciergeContext.Provider
      value={{
        messages,
        sendUserMessage,
        sendAdminMessage,
        markMessagesAsRead,
        markAdminMessagesAsRead,
        deleteUserChat,
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