import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ChatMessage = {
  id: string;
  userLogin: string;
  author: "user" | "admin";
  text: string;
  createdAt?: string | Date;

  readByUser?: boolean;
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

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function normalizeMessage(
  message: Record<string, unknown>
): ChatMessage {
  return {
    id: String(message.id ?? ""),
    userLogin: String(
      message.userLogin ?? ""
    ),
    author:
      message.author === "admin"
        ? "admin"
        : "user",
    text: String(message.text ?? ""),
    readByUser:
      Boolean(message.readByUser),
    readByAdmin:
      Boolean(message.readByAdmin),
    createdAt:
      typeof message.createdAt === "string"
        ? message.createdAt
        : message.createdAt
          ? new Date(
              String(message.createdAt)
            )
          : undefined,
  };
}

async function fetchMessages(): Promise<
  ChatMessage[]
> {
  const response = await fetch(
    `${API_URL}/api/messages`
  );

  if (!response.ok) {
    throw new Error(
      "Не удалось загрузить сообщения"
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.messages)) {
    return [];
  }

  return data.messages
    .map(
      (message: Record<string, unknown>) =>
        normalizeMessage(message)
    )
    .sort((a: ChatMessage, b: ChatMessage) => {
      const timeA = new Date(
        String(a.createdAt ?? 0)
      ).getTime();

      const timeB = new Date(
        String(b.createdAt ?? 0)
      ).getTime();

      if (timeA === timeB) {
        return a.id.localeCompare(b.id);
      }

      return timeA - timeB;
    });
}

export function ConciergeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const loadingRef = useRef(false);

  /*
   * PostgreSQL polling.
   *
   * Каждые 2 секунды забираем актуальные
   * сообщения с Render API.
   */
  useEffect(() => {
    let stopped = false;

    async function loadMessages() {
      if (
        stopped ||
        loadingRef.current
      ) {
        return;
      }

      loadingRef.current = true;

      try {
        const list =
          await fetchMessages();

        if (!stopped) {
          setMessages(list);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки сообщений:",
          error
        );
      } finally {
        loadingRef.current = false;
      }
    }

    void loadMessages();

    const interval = window.setInterval(
      () => {
        void loadMessages();
      },
      2000
    );

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, []);

  /*
   * Пользователь отправляет сообщение.
   */
  async function sendUserMessage(
    userLogin: string,
    text: string
  ) {
    const cleanText =
      text.trim();

    if (
      !cleanText ||
      !userLogin
    ) {
      return;
    }

    const response = await fetch(
      `${API_URL}/api/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          userLogin,
          author: "user",
          text: cleanText,
          readByUser: true,
          readByAdmin: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Не удалось отправить сообщение"
      );
    }
  }

  /*
   * Администратор отправляет сообщение.
   */
  async function sendAdminMessage(
    userLogin: string,
    text: string
  ) {
    const cleanText =
      text.trim();

    if (
      !cleanText ||
      !userLogin
    ) {
      return;
    }

    const response = await fetch(
      `${API_URL}/api/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          userLogin,
          author: "admin",
          text: cleanText,
          readByUser: false,
          readByAdmin: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Не удалось отправить сообщение"
      );
    }
  }

  /*
   * Пометить сообщения прочитанными.
   */
  async function markMessagesAsRead(
    userLogin: string,
    author?: "user" | "admin"
  ) {
    if (!userLogin) {
      return;
    }

    const unreadMessages =
      messages.filter(
        (message) => {
          if (
            message.userLogin !==
            userLogin
          ) {
            return false;
          }

          if (author === "admin") {
            return (
              message.author ===
                "admin" &&
              message.readByUser !== true
            );
          }

          if (author === "user") {
            return (
              message.author ===
                "user" &&
              message.readByAdmin !==
                true
            );
          }

          return (
            (
              message.author ===
                "admin" &&
              message.readByUser !==
                true
            ) ||
            (
              message.author ===
                "user" &&
              message.readByAdmin !==
                true
            )
          );
        }
      );

    if (
      unreadMessages.length === 0
    ) {
      return;
    }

    await Promise.all(
      unreadMessages.map(
        async (message) => {
          const field =
            message.author === "admin"
              ? "readByUser"
              : "readByAdmin";

          const response =
            await fetch(
              `${API_URL}/api/messages/${encodeURIComponent(
                message.id
              )}/read`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  field,
                }),
              }
            );

          if (!response.ok) {
            throw new Error(
              `Не удалось отметить сообщение ${message.id}`
            );
          }
        }
      )
    );

    /*
     * Немедленно обновляем локальное состояние,
     * не дожидаясь следующего polling.
     */
    setMessages((current) =>
      current.map((message) => {
        const found =
          unreadMessages.some(
            (item) =>
              item.id === message.id
          );

        if (!found) {
          return message;
        }

        if (
          message.author === "admin"
        ) {
          return {
            ...message,
            readByUser: true,
          };
        }

        return {
          ...message,
          readByAdmin: true,
        };
      })
    );
  }

  /*
   * Удалить весь чат пользователя.
   */
  async function deleteChat(
    userLogin: string
  ) {
    if (!userLogin) {
      return;
    }

    const response =
      await fetch(
        `${API_URL}/api/messages/chat/${encodeURIComponent(
          userLogin
        )}`,
        {
          method: "DELETE",
        }
      );

    if (!response.ok) {
      throw new Error(
        "Не удалось удалить чат"
      );
    }

    setMessages((current) =>
      current.filter(
        (message) =>
          message.userLogin !==
          userLogin
      )
    );
  }

  function getUnreadForUser(
    userLogin: string
  ) {
    return messages.filter(
      (message) =>
        message.userLogin ===
          userLogin &&
        message.author ===
          "admin" &&
        message.readByUser !== true
    ).length;
  }

  function getUnreadForAdmin(
    userLogin: string
  ) {
    return messages.filter(
      (message) =>
        message.userLogin ===
          userLogin &&
        message.author ===
          "user" &&
        message.readByAdmin !== true
    ).length;
  }

  function getTotalUnreadForAdmin() {
    return messages.filter(
      (message) =>
        message.author ===
          "user" &&
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