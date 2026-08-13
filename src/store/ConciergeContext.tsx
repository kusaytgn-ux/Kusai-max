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
  doc,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

export type ChatMessage = {
  id: string;
  userLogin: string;
  author: "user" | "admin";
  text: string;
  createdAt?: any;
  read?: boolean;
};

type ConciergeContextType = {
  messages: ChatMessage[];

  unreadAdminCount: number;
  unreadUserCount: number;

  sendUserMessage: (
    userLogin: string,
    text: string
  ) => Promise<void>;

  sendAdminMessage: (
    userLogin: string,
    text: string
  ) => Promise<void>;

  markAdminMessagesAsRead: (
    userLogin?: string
  ) => Promise<void>;

  markUserMessagesAsRead: (
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
   * =========================================================
   * REALTIME СООБЩЕНИЯ
   * =========================================================
   */

  useEffect(() => {
    const messagesQuery = query(
      collection(db, "messages"),
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

        setMessages(list);
      },
      (error) => {
        console.error(
          "Ошибка realtime-загрузки сообщений:",
          error
        );
      }
    );

    return unsubscribe;
  }, []);

  /*
   * =========================================================
   * НЕПРОЧИТАННЫЕ ДЛЯ АДМИНИСТРАТОРА
   * =========================================================
   */

  const unreadAdminCount = messages.filter(
    (message) =>
      message.author === "user" &&
      message.read === false
  ).length;

  /*
   * =========================================================
   * НЕПРОЧИТАННЫЕ ДЛЯ ПОЛЬЗОВАТЕЛЯ
   * =========================================================
   */

  const unreadUserCount = messages.filter(
    (message) =>
      message.author === "admin" &&
      message.read === false
  ).length;

  /*
   * =========================================================
   * ПОЛЬЗОВАТЕЛЬ ОТПРАВЛЯЕТ СООБЩЕНИЕ
   * =========================================================
   */

  async function sendUserMessage(
    userLogin: string,
    text: string
  ) {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    await addDoc(
      collection(db, "messages"),
      {
        userLogin,
        author: "user",
        text: trimmedText,
        read: false,
        createdAt: serverTimestamp(),
      }
    );
  }

  /*
   * =========================================================
   * АДМИНИСТРАТОР ОТПРАВЛЯЕТ СООБЩЕНИЕ
   * =========================================================
   */

  async function sendAdminMessage(
    userLogin: string,
    text: string
  ) {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    await addDoc(
      collection(db, "messages"),
      {
        userLogin,
        author: "admin",
        text: trimmedText,
        read: false,
        createdAt: serverTimestamp(),
      }
    );
  }

  /*
   * =========================================================
   * АДМИН ПРОЧИТАЛ СООБЩЕНИЯ
   * =========================================================
   */

  async function markAdminMessagesAsRead(
    userLogin?: string
  ) {
    const unreadMessages = messages.filter(
      (message) =>
        message.author === "user" &&
        message.read === false &&
        (!userLogin ||
          message.userLogin === userLogin)
    );

    if (unreadMessages.length === 0) {
      return;
    }

    const batch = writeBatch(db);

    unreadMessages.forEach((message) => {
      const messageRef = doc(
        db,
        "messages",
        message.id
      );

      batch.update(messageRef, {
        read: true,
      });
    });

    await batch.commit();
  }

  /*
   * =========================================================
   * ПОЛЬЗОВАТЕЛЬ ПРОЧИТАЛ ОТВЕТЫ АДМИНИСТРАТОРА
   * =========================================================
   */

  async function markUserMessagesAsRead(
    userLogin: string
  ) {
    if (!userLogin) {
      return;
    }

    const unreadMessages = messages.filter(
      (message) =>
        message.author === "admin" &&
        message.read === false &&
        message.userLogin === userLogin
    );

    if (unreadMessages.length === 0) {
      return;
    }

    const batch = writeBatch(db);

    unreadMessages.forEach((message) => {
      const messageRef = doc(
        db,
        "messages",
        message.id
      );

      batch.update(messageRef, {
        read: true,
      });
    });

    await batch.commit();
  }

  return (
    <ConciergeContext.Provider
      value={{
        messages,

        unreadAdminCount,
        unreadUserCount,

        sendUserMessage,
        sendAdminMessage,

        markAdminMessagesAsRead,
        markUserMessagesAsRead,
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