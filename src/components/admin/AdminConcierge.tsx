import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MessageCircle,
  Send,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useConcierge } from "../../store/ConciergeContext";

import ChatUserCard from "./ChatUserCard";

function AdminConcierge() {
  const {
    messages,
    sendAdminMessage,
    markMessagesAsRead,
    deleteChat,
    getUnreadForAdmin,
    getTotalUnreadForAdmin,
  } = useConcierge();

  const [selectedUser, setSelectedUser] =
    useState("");

  const [text, setText] =
    useState("");

  const [newUser, setNewUser] =
    useState("");

  const [showNewChat, setShowNewChat] =
    useState(false);

  const [deleteConfirm, setDeleteConfirm] =
    useState(false);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  /*
   * Получаем пользователей из сообщений.
   *
   * Set убирает дубликаты.
   */
  const users = useMemo(() => {
    const list = [
      ...new Set(
        messages
          .map(
            (message) =>
              message.userLogin
          )
          .filter(Boolean)
      ),
    ];

    /*
     * Сначала пользователи с последними
     * сообщениями.
     */
    return list.sort((a, b) => {
      const lastA = [...messages]
        .reverse()
        .find(
          (message) =>
            message.userLogin === a
        );

      const lastB = [...messages]
        .reverse()
        .find(
          (message) =>
            message.userLogin === b
        );

      const timeA =
        lastA?.createdAt?.toMillis?.() ??
        lastA?.createdAt?.seconds ??
        0;

      const timeB =
        lastB?.createdAt?.toMillis?.() ??
        lastB?.createdAt?.seconds ??
        0;

      return timeB - timeA;
    });
  }, [messages]);

  /*
   * Сообщения выбранного пользователя.
   */
  const chat = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.userLogin ===
          selectedUser
      ),
    [messages, selectedUser]
  );

  /*
   * Общее количество новых сообщений.
   */
  const totalUnread =
    getTotalUnreadForAdmin();

  /*
   * Автоматическая прокрутка чата вниз.
   */
  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat, selectedUser]);

  /*
   * Когда админ открывает чат —
   * сообщения пользователя становятся прочитанными.
   */
  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    markMessagesAsRead(
      selectedUser,
      "user"
    ).catch((error) => {
      console.error(
        "Ошибка отметки сообщений:",
        error
      );
    });
  }, [
    selectedUser,
    messages,
    markMessagesAsRead,
  ]);

  /*
   * Отправка сообщения.
   */
  async function handleSend() {
    if (
      !text.trim() ||
      !selectedUser.trim()
    ) {
      return;
    }

    try {
      await sendAdminMessage(
        selectedUser.trim(),
        text.trim()
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
   * Начать новый чат первым.
   */
  function handleStartNewChat() {
    const login =
      newUser.trim();

    if (!login) {
      return;
    }

    setSelectedUser(login);
    setNewUser("");
    setShowNewChat(false);
  }

  /*
   * Удаление чата.
   */
  async function handleDeleteChat() {
    if (!selectedUser) {
      return;
    }

    try {
      await deleteChat(
        selectedUser
      );

      setSelectedUser("");
      setText("");
      setDeleteConfirm(false);
    } catch (error) {
      console.error(
        "Ошибка удаления чата:",
        error
      );
    }
  }

  return (
    <div className="flex h-[80vh] min-h-0 overflow-hidden rounded-3xl bg-zinc-900">

      {/* ========================= */}
      {/* ЛЕВАЯ КОЛОНКА */}
      {/* ========================= */}

      <div className="flex w-80 min-h-0 shrink-0 flex-col border-r border-zinc-800">

        {/* Заголовок */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 p-5">

          <div className="flex items-center gap-3">

            <MessageCircle
              size={32}
              className="text-yellow-400"
            />

            <div>

              <h2 className="text-2xl font-bold text-white">
                Concierge
              </h2>

              <p className="text-sm text-zinc-500">
                {totalUnread > 0
                  ? `${totalUnread} новых сообщений`
                  : "Нет новых сообщений"}
              </p>

            </div>

            {totalUnread > 0 && (
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-red-500 px-2 text-sm font-bold text-white">
                {totalUnread}
              </span>
            )}

          </div>

          {/* Новый чат */}
          <button
            type="button"
            onClick={() =>
              setShowNewChat(true)
            }
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black transition hover:scale-105"
            title="Новый чат"
          >
            <Plus size={26} />
          </button>

        </div>

        {/* Список пользователей */}
        <div className="min-h-0 flex-1 overflow-y-auto">

          {users.length === 0 ? (

            <div className="p-6 text-center text-zinc-500">
              Пока нет чатов
            </div>

          ) : (

            users.map((user) => {

              const unread =
                getUnreadForAdmin(
                  user
                );

              return (
                <div
                  key={user}
                  className="relative"
                >

                  <ChatUserCard
                    key={user}
                    login={user}
                    selected={
                      selectedUser ===
                      user
                    }
                    onClick={() => {
                      setSelectedUser(
                        user
                      );
                    }}
                  />

                  {/* Непрочитанные */}
                  {unread > 0 && (
                    <span className="pointer-events-none absolute right-4 top-1/2 flex h-7 min-w-7 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                      {unread}
                    </span>
                  )}

                </div>
              );
            })

          )}

        </div>

      </div>

      {/* ========================= */}
      {/* ПРАВАЯ КОЛОНКА */}
      {/* ========================= */}

      <div className="flex min-w-0 min-h-0 flex-1 flex-col">

        {/* Заголовок чата */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 p-5">

          <div>

            <h2 className="text-2xl font-bold text-white">
              {selectedUser ||
                "Выберите пользователя"}
            </h2>

            {selectedUser && (
              <p className="mt-1 text-sm text-zinc-500">
                {chat.length} сообщений
              </p>
            )}

          </div>

          {/* Удаление */}
          {selectedUser && (
            <button
              type="button"
              onClick={() =>
                setDeleteConfirm(true)
              }
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 text-red-400 transition hover:bg-red-500 hover:text-white"
              title="Удалить чат"
            >
              <Trash2 size={20} />
            </button>
          )}

        </div>

        {/* Сообщения */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">

          {!selectedUser ? (

            <div className="flex h-full items-center justify-center">

              <p className="text-xl text-zinc-600">
                Выберите пользователя
              </p>

            </div>

          ) : chat.length === 0 ? (

            <div className="flex h-full items-center justify-center">

              <p className="text-zinc-500">
                Сообщений пока нет.
                <br />
                Напишите пользователю первым.
              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {chat.map((message) => (

                <div
                  key={message.id}
                  className={`flex ${
                    message.author ===
                    "admin"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  <div
                    className={`max-w-[70%] rounded-3xl px-5 py-3 ${
                      message.author ===
                      "admin"
                        ? "bg-yellow-400 text-black"
                        : "bg-zinc-800 text-white"
                    }`}
                  >

                    <p>
                      {message.text}
                    </p>

                    <span
                      className={`mt-2 block text-right text-xs opacity-60`}
                    >
                      {message.createdAt
                        ?.toDate
                        ? message.createdAt
                            .toDate()
                            .toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )
                        : ""}
                    </span>

                  </div>

                </div>

              ))}

              <div
                ref={bottomRef}
              />

            </div>

          )}

        </div>

        {/* Поле отправки */}
        {selectedUser && (
          <div className="flex shrink-0 gap-3 border-t border-zinc-800 p-5">

            <input
              value={text}
              onChange={(event) =>
                setText(
                  event.target.value
                )
              }
              placeholder="Введите сообщение..."
              className="min-w-0 flex-1 rounded-2xl bg-black px-5 py-3 text-white outline-none"
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleSend();
                }
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black transition hover:scale-105"
              title="Отправить"
            >
              <Send size={20} />
            </button>

          </div>
        )}

      </div>

      {/* ========================= */}
      {/* НОВЫЙ ЧАТ */}
      {/* ========================= */}

      {showNewChat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5">

          <div className="w-full max-w-md rounded-3xl bg-zinc-900 p-6 shadow-2xl">

            <div className="mb-5 flex items-center justify-between">

              <h3 className="text-2xl font-bold text-white">
                Новый чат
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowNewChat(false)
                }
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X size={20} />
              </button>

            </div>

            <p className="mb-4 text-sm text-zinc-500">
              Введите телефон или логин пользователя.
            </p>

            <input
              autoFocus
              value={newUser}
              onChange={(event) =>
                setNewUser(
                  event.target.value
                )
              }
              placeholder="+79000000000"
              className="w-full rounded-2xl bg-black px-5 py-4 text-white outline-none"
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleStartNewChat();
                }
              }}
            />

            <button
              type="button"
              onClick={
                handleStartNewChat
              }
              className="mt-4 w-full rounded-2xl bg-yellow-400 py-4 font-bold text-black transition hover:scale-[1.01]"
            >
              Открыть чат
            </button>

          </div>

        </div>
      )}

      {/* ========================= */}
      {/* ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ */}
      {/* ========================= */}

      {deleteConfirm &&
        selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5">

            <div className="w-full max-w-md rounded-3xl bg-zinc-900 p-6 shadow-2xl">

              <h3 className="text-2xl font-bold text-white">
                Удалить чат?
              </h3>

              <p className="mt-3 text-zinc-400">
                Все сообщения пользователя{" "}
                <span className="font-bold text-white">
                  {selectedUser}
                </span>{" "}
                будут удалены без возможности восстановления.
              </p>

              <div className="mt-6 flex gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirm(false)
                  }
                  className="flex-1 rounded-2xl bg-zinc-800 py-3 font-bold text-white hover:bg-zinc-700"
                >
                  Отмена
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeleteChat
                  }
                  className="flex-1 rounded-2xl bg-red-500 py-3 font-bold text-white hover:bg-red-600"
                >
                  Удалить
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}

export default AdminConcierge;