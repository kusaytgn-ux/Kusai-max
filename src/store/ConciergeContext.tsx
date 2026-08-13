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

  // Прочитано ли сообщение админа пользователем
  readByUser?: boolean;

  // Прочитано ли сообщение пользователя администратором
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
    userLogin: string,
    author?: "user" | "admin"
  ) => Promise<void>;

  deleteChat: (
    userLogin: string
  ) => Promise<void>;

  getUnreadForUser: (
    userLogin: string
  ) => number;

  getUnreadForAdmin: (
    userLogin: string
  ) => number;

  getTotalUnreadForAdmin: () => number;
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
    const messagesRef =
      collection(db, "messages");

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
         * serverTimestamp() может быть null
         * непосредственно после создания сообщения.
         *
         * Поэтому дополнительно сортируем
         * сообщения на клиенте.
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

        /*
         * ВАЖНО:
         * onSnapshot срабатывает сразу после addDoc.
         * Поэтому сообщение появляется у второй стороны
         * сразу, а не после отправки следующего сообщения.
         */
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

    if (!cleanText || !userLogin) {
      return;
    }

    await addDoc(
      collection(db, "messages"),
      {
        userLogin,
        author: "user",
        text: cleanText,

        // Пользователь своё сообщение уже написал
        readByUser: true,

        // Для администратора сообщение новое
        readByAdmin: false,

        createdAt: serverTimestamp(),
      }
    );
  }

  /*
   * АДМИНИСТРАТОР ОТПРАВЛЯЕТ СООБЩЕНИЕ
   *
   * Админ может отправить сообщение даже если
   * у пользователя раньше не было сообщений.
   */
  async function sendAdminMessage(
    userLogin: string,
    text: string
  ) {
    const cleanText = text.trim();

    if (!cleanText || !userLogin) {
      return;
    }

    await addDoc(
      collection(db, "messages"),
      {
        userLogin,
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
   * ПОМЕТИТЬ СООБЩЕНИЯ ПРОЧИТАННЫМИ
   *
   * author:
   * "admin" -> пользователь прочитал сообщения админа
   * "user"  -> админ прочитал сообщения пользователя
   *
   * Если author не передан — помечаем оба типа.
   */
  async function markMessagesAsRead(
    userLogin: string,
    author?: "user" | "admin"
  ) {
    if (!userLogin) {
      return;
    }

    const unreadMessages = messages.filter(
      (message) => {
        if (message.userLogin !== userLogin) {
          return false;
        }

        if (author === "admin") {
          return (
            message.author === "admin" &&
            message.readByUser !== true
          );
        }

        if (author === "user") {
          return (
            message.author === "user" &&
            message.readByAdmin !== true
          );
        }

        return (
          (
            message.author === "admin" &&
            message.readByUser !== true
          ) ||
          (
            message.author === "user" &&
            message.readByAdmin !== true
          )
        );
      }
    );

    if (unreadMessages.length === 0) {
      return;
    }

    await Promise.all(
      unreadMessages.map((message) => {
        const messageRef = doc(
          db,
          "messages",
          message.id
        );

        if (message.author === "admin") {
          return updateDoc(messageRef, {
            readByUser: true,
          });
        }

        return updateDoc(messageRef, {
          readByAdmin: true,
        });
      })
    );
  }

  /*
   * УДАЛЕНИЕ ВСЕГО ЧАТА
   *
   * Удаляем все сообщения конкретного пользователя
   * одним batch-запросом.
   */
  async function deleteChat(
    userLogin: string
  ) {
    if (!userLogin) {
      return;
    }

    const chatMessages = messages.filter(
      (message) =>
        message.userLogin === userLogin
    );

    if (chatMessages.length === 0) {
      return;
    }

    const batch = writeBatch(db);

    chatMessages.forEach((message) => {
      const messageRef = doc(
        db,
        "messages",
        message.id
      );

      batch.delete(messageRef);
    });

    await batch.commit();
  }

  /*
   * НОВЫЕ СООБЩЕНИЯ ДЛЯ ПОЛЬЗОВАТЕЛЯ
   */
  function getUnreadForUser(
    userLogin: string
  ) {
    return messages.filter(
      (message) =>
        message.userLogin === userLogin &&
        message.author === "admin" &&
        message.readByUser !== true
    ).length;
  }

  /*
   * НОВЫЕ СООБЩЕНИЯ ОТ ПОЛЬЗОВАТЕЛЯ
   * ДЛЯ АДМИНИСТРАТОРА
   */
  function getUnreadForAdmin(
    userLogin: string
  ) {
    return messages.filter(
      (message) =>
        message.userLogin === userLogin &&
        message.author === "user" &&
        message.readByAdmin !== true
    ).length;
  }

  /*
   * ОБЩЕЕ КОЛИЧЕСТВО НЕПРОЧИТАННЫХ
   * ДЛЯ АДМИНИСТРАТОРА
   */
  function getTotalUnreadForAdmin() {
    return messages.filter(
      (message) =>
        message.author === "user" &&
        message.readByAdmin !== true
    ).length;
  }

  return (
    <ConciergeContext.Provider
      value={{
        messages,
        sendUserMessage,
        sendAdminMessage,
        markMessagesAsRead,
        deleteChat,
        getUnreadForUser,
        getUnreadForAdmin,
        getTotalUnreadForAdmin,
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