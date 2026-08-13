import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MessageCircle,
  Send,
  Trash2,
  Plus,
} from "lucide-react";

import { useConcierge } from "../../store/ConciergeContext";

function AdminConcierge() {
  const {
    messages,
    sendAdminMessage,
    markAdminMessagesAsRead,
    deleteUserChat,
  } = useConcierge();

  const [selectedUser, setSelectedUser] =
    useState("");

  const [text, setText] =
    useState("");

  const [newUserLogin, setNewUserLogin] =
    useState("");

  const [newChatOpen, setNewChatOpen] =
    useState(false);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  /*
   * СПИСОК ПОЛЬЗОВАТЕЛЕЙ
   *
   * Берём всех пользователей, которые
   * когда-либо писали или которым писал админ.
   */
  const users = useMemo(() => {
    const list = [
      ...new Set(
        messages
          .map((message) => message.userLogin)
          .filter(Boolean)
      ),
    ];

    return list;
  }, [messages]);

  /*
   * ТЕКУЩИЙ ЧАТ
   */
  const chat = useMemo(() => {
    return messages.filter(
      (message) =>
        message.userLogin === selectedUser
    );
  }, [messages, selectedUser]);

  /*
   * ОБЩЕЕ КОЛИЧЕСТВО НЕПРОЧИТАННЫХ
   * СООБЩЕНИЙ ОТ ПОЛЬЗОВАТЕЛЕЙ
   */
  const totalUnread = useMemo(() => {
    return messages.filter(
      (message) =>
        message.author === "user" &&
        message.readByAdmin !== true
    ).length;
  }, [messages]);

  /*
   * КОЛИЧЕСТВО НЕПРОЧИТАННЫХ
   * У КОНКРЕТНОГО ПОЛЬЗОВАТЕЛЯ
   */
  function getUnreadCount(
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
   * ПРИ ОТКРЫТИИ ЧАТА ПОМЕЧАЕМ
   * СООБЩЕНИЯ ПОЛЬЗОВАТЕЛЯ ПРОЧИТАННЫМИ
   */
  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    markAdminMessagesAsRead(
      selectedUser
    ).catch((error) => {
      console.error(
        "Ошибка отметки сообщений администратора:",
        error
      );
    });
  }, [
    selectedUser,
    messages,
    markAdminMessagesAsRead,
  ]);

  /*
   * ПРОКРУТКА ЧАТА ВНИЗ
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat]);

  /*
   * ОТПРАВКА СООБЩЕНИЯ
   */
  async function handleSend() {
    const cleanText = text.trim();

    if (
      !cleanText ||
      !selectedUser
    ) {
      return;
    }

    try {
      await sendAdminMessage(
        selectedUser,
        cleanText
      );

      setText("");
    } catch (error) {
      console.error(
        "Ошибка отправки сообщения:",
        error
      );
    }
  }

  /*
   * АДМИН НАЧИНАЕТ НОВЫЙ ЧАТ
   */
  async function handleStartNewChat() {
    const login =
      newUserLogin.trim();

    if (!login) {
      return;
    }

    setSelectedUser(login);
    setNewUserLogin("");
    setNewChatOpen(false);

    /*
     * Если админ сразу вводит сообщение,
     * оно отправится уже в выбранный чат.
     */
  }

  /*
   * УДАЛЕНИЕ ЧАТА
   */
  async function handleDeleteChat() {
    if (!selectedUser) {
      return;
    }

    const confirmed =
      window.confirm(
        `Удалить весь чат с пользователем ${selectedUser}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteUserChat(
        selectedUser
      );

      setSelectedUser("");
      setText("");
    } catch (error) {
      console.error(
        "Ошибка удаления чата:",
        error
      );
    }
  }

  return (
    <div className="flex h-[80vh] overflow-hidden rounded-3xl bg-zinc-900">

      {/* ========================= */}
      {/* ЛЕВАЯ ПАНЕЛЬ ПОЛЬЗОВАТЕЛЕЙ */}
      {/* ========================= */}

      <div className="w-80 border-r border-zinc-800">

        <div className="flex items-center justify-between border-b border-zinc-800 p-5">

          <div className="flex items-center gap-3">

            <div className="relative">

              <MessageCircle
                size={26}
                className="text-yellow-400"
              />

              {totalUnread > 0 && (
                <span className="absolute -right-3 -top-3 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {totalUnread > 99
                    ? "99+"
                    : totalUnread}
                </span>
              )}

            </div>

            <div>
              <h2 className="text-2xl font-bold">
                Concierge
              </h2>

              <p className="text-xs text-zinc-500">
                {totalUnread > 0
                  ? `${totalUnread} новых`
                  : "Нет новых сообщений"}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              setNewChatOpen(
                (previous) => !previous
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-black transition hover:bg-yellow-300"
            title="Начать новый чат"
          >
            <Plus size={20} />
          </button>

        </div>

        {/* Новый чат */}

        {newChatOpen && (
          <div className="border-b border-zinc-800 p-4">

            <p className="mb-2 text-sm font-semibold text-white">
              Новый чат
            </p>

            <input
              value={newUserLogin}
              onChange={(event) =>
                setNewUserLogin(
                  event.target.value
                )
              }
              placeholder="Телефон пользователя"
              className="w-full rounded-xl bg-black px-4 py-3 text-sm text-white outline-none ring-yellow-400 focus:ring-1"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleStartNewChat();
                }
              }}
            />

            <button
              type="button"
              onClick={
                handleStartNewChat
              }
              className="mt-2 w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
            >
              Открыть чат
            </button>

          </div>
        )}

        {/* Пользователи */}

        <div className="h-full overflow-y-auto">

          {users.length === 0 ? (
            <div className="p-5 text-center text-sm text-zinc-500">
              Пока нет чатов
            </div>
          ) : (
            users.map((user) => {
              const unread =
                getUnreadCount(user);

              const lastMessage =
                [...messages]
                  .filter(
                    (message) =>
                      message.userLogin ===
                      user
                  )
                  .sort((a, b) => {
                    const timeA =
                      a.createdAt?.toMillis?.() ??
                      0;

                    const timeB =
                      b.createdAt?.toMillis?.() ??
                      0;

                    return (
                      timeB - timeA
                    );
                  })[0];

              return (
                <button
                  type="button"
                  key={user}
                  onClick={() =>
                    setSelectedUser(user)
                  }
                  className={`flex w-full items-center gap-3 border-b border-zinc-800 px-4 py-4 text-left transition ${
                    selectedUser === user
                      ? "bg-zinc-800"
                      : "hover:bg-zinc-800/60"
                  }`}
                >

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-400 font-bold text-black">
                    {user
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex items-center justify-between gap-2">

                      <p className="truncate font-semibold text-white">
                        {user}
                      </p>

                      {unread > 0 && (
                        <span className="flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                          {unread > 99
                            ? "99+"
                            : unread}
                        </span>
                      )}

                    </div>

                    {lastMessage && (
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {lastMessage.author ===
                        "admin"
                          ? "Вы: "
                          : ""}
                        {lastMessage.text}
                      </p>
                    )}

                  </div>

                </button>
              );
            })
          )}

        </div>

      </div>

      {/* ========================= */}
      {/* ПРАВАЯ ЧАСТЬ — ЧАТ */}
      {/* ========================= */}

      <div className="flex min-w-0 flex-1 flex-col">

        {/* Заголовок */}

        <div className="flex items-center justify-between border-b border-zinc-800 p-5">

          <div>

            <h2 className="text-2xl font-bold text-white">
              {selectedUser ||
                "Выберите пользователя"}
            </h2>

            {selectedUser && (
              <p className="mt-1 text-xs text-zinc-500">
                Concierge
              </p>
            )}

          </div>

          {selectedUser && (
            <button
              type="button"
              onClick={
                handleDeleteChat
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white transition hover:bg-red-500"
              title="Удалить чат"
            >
              <Trash2 size={19} />
            </button>
          )}

        </div>

        {/* Сообщения */}

        <div className="flex-1 space-y-4 overflow-y-auto p-5">

          {!selectedUser ? (
            <div className="flex h-full items-center justify-center text-zinc-500">
              Выберите пользователя
            </div>
          ) : chat.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-zinc-500">
              <div>
                <MessageCircle
                  size={45}
                  className="mx-auto mb-4 text-zinc-700"
                />

                <p>
                  Чат пуст
                </p>

                <p className="mt-1 text-sm">
                  Можно написать пользователю первым
                </p>
              </div>
            </div>
          ) : (
            <>
              {chat.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[70%] rounded-3xl px-5 py-3 ${
                    message.author === "admin"
                      ? "ml-auto bg-yellow-400 text-black"
                      : "bg-zinc-800 text-white"
                  }`}
                >

                  <div className="flex flex-col gap-2">

                    <p>
                      {message.text}
                    </p>

                    <span className="text-right text-xs opacity-60">
                      {message.createdAt?.toDate
                        ? message.createdAt
                            .toDate()
                            .toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                        : ""}
                    </span>

                  </div>

                </div>
              ))}

              <div ref={bottomRef} />
            </>
          )}

        </div>

        {/* Поле сообщения */}

        {selectedUser && (
          <div className="flex gap-3 border-t border-zinc-800 p-5">

            <input
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              placeholder="Введите сообщение..."
              className="flex-1 rounded-2xl bg-black px-5 py-3 text-white outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSend();
                }
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={20} />
            </button>

          </div>
        )}

      </div>

    </div>
  );
}

export default AdminConcierge;