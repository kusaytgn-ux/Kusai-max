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

  const [userNames, setUserNames] =
    useState<Record<string, string>>({});

  const bottomRef =
    useRef<HTMLDivElement>(null);

  /*
   * =========================
   * ЗАГРУЗКА ИМЁН ПОЛЬЗОВАТЕЛЕЙ
   * =========================
   *
   * Предполагается:
   * users/{id}
   *
   * {
   *   name: "Ярослав",
   *   phone: "+79061234567"
   * }
   */

useEffect(() => {
  async function loadUsers() {
    try {
      const phones = Array.from(
        new Set(
          messages
            .map(
              (message) =>
                message.userLogin
            )
            .filter(Boolean)
        )
      );

      const names: Record<
        string,
        string
      > = {};

      await Promise.all(
        phones.map(async (phone) => {
          try {
            const response =
              await fetch(
                `${
                  (
                    import.meta.env
                      .VITE_API_URL ||
                    "http://localhost:3001"
                  ).replace(/\/$/, "")
                }/api/clients/phone/${encodeURIComponent(
                  phone
                )}`
              );

            if (!response.ok) {
              return;
            }

            const data =
              await response.json();

            if (data.success) {
              names[phone] =
                data.client?.name ||
                "Пользователь";
            }
          } catch (error) {
            console.error(
              "Ошибка получения клиента:",
              error
            );
          }
        })
      );

      setUserNames(names);
    } catch (error) {
      console.error(
        "Ошибка загрузки пользователей:",
        error
      );
    }
  }

  void loadUsers();
}, [messages]);

  /*
   * =========================
   * СПИСОК ПОЛЬЗОВАТЕЛЕЙ
   * =========================
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
     * Сначала пользователи,
     * у которых самое новое сообщение.
     */

    return list.sort((a, b) => {
      const lastA =
        [...messages]
          .reverse()
          .find(
            (message) =>
              message.userLogin === a
          );

      const lastB =
        [...messages]
          .reverse()
          .find(
            (message) =>
              message.userLogin === b
          );

      const timeA = lastA?.createdAt
        ? new Date(
            String(lastA.createdAt)
          ).getTime()
        : 0;

      const timeB = lastB?.createdAt
        ? new Date(
            String(lastB.createdAt)
          ).getTime()
        : 0;

      return timeB - timeA;
    });
  }, [messages]);

  /*
   * =========================
   * ПОЛУЧИТЬ ИМЯ
   * =========================
   */

  function getUserName(
    phone: string
  ) {
    return (
      userNames[phone] ||
      "Пользователь"
    );
  }

  /*
   * =========================
   * ЧАТ ВЫБРАННОГО ПОЛЬЗОВАТЕЛЯ
   * =========================
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
   * =========================
   * ОБЩЕЕ КОЛИЧЕСТВО НЕПРОЧИТАННЫХ
   * =========================
   */

  const totalUnread =
    getTotalUnreadForAdmin();

  /*
   * =========================
   * ПРОКРУТКА ЧАТА ВНИЗ
   * =========================
   */

 useEffect(() => {
  if (!selectedUser) {
    return;
  }

  const hasUnread = messages.some(
    (message) =>
      message.userLogin === selectedUser &&
      message.author === "user" &&
      message.readByAdmin !== true
  );

  if (!hasUnread) {
    return;
  }

  void markMessagesAsRead(
    selectedUser,
    "user"
  );
}, [
  selectedUser,
  messages,
  markMessagesAsRead,
]);

  /*
   * =========================
   * ПРОЧИТАТЬ СООБЩЕНИЯ
   * =========================
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
   * =========================
   * ОТПРАВКА СООБЩЕНИЯ
   * =========================
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
   * =========================
   * НОВЫЙ ЧАТ
   * =========================
   *
   * Пользователь вводит:
   * 9061234567
   *
   * Мы отправляем:
   * +79061234567
   */

  function handleNewUserChange(
    value: string
  ) {
    /*
     * Оставляем только цифры.
     */

    const digits =
      value.replace(/\D/g, "");

    /*
     * Максимум 10 цифр.
     */

    const limited =
      digits.slice(0, 10);

    setNewUser(limited);
  }

  function handleStartNewChat() {
    /*
     * Должно быть ровно 10 цифр.
     */

    if (newUser.length !== 10) {
      return;
    }

    const phone =
      `+7${newUser}`;

    setSelectedUser(phone);

    setNewUser("");

    setShowNewChat(false);
  }

  /*
   * =========================
   * УДАЛЕНИЕ ЧАТА
   * =========================
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

            users.map((phone) => {

              const unread =
                getUnreadForAdmin(
                  phone
                );

              const name =
                getUserName(phone);

              return (
                <button
                  key={phone}
                  type="button"
                  onClick={() => {
                    setSelectedUser(
                      phone
                    );
                  }}
                  className={`relative flex w-full items-center gap-4 border-b border-zinc-800 px-5 py-4 text-left transition ${
                    selectedUser === phone
                      ? "bg-zinc-800"
                      : "hover:bg-zinc-800/60"
                  }`}
                >

                  {/* Аватар */}

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xl font-bold text-black">
                    {name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  {/* Имя + телефон */}

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-lg font-bold text-white">
                      {name}
                    </p>

                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {phone}
                    </p>

                  </div>

                  {/* Непрочитанные */}

                  {unread > 0 && (
                    <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                      {unread}
                    </span>
                  )}

                </button>
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

              {selectedUser
                ? getUserName(
                    selectedUser
                  )
                : "Выберите пользователя"}

            </h2>

            {selectedUser && (
              <p className="mt-1 text-sm text-zinc-500">
                {selectedUser}
                {" • "}
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

              <p className="text-center text-zinc-500">
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

                    <span className="mt-2 block text-right text-xs opacity-60">

                      {message.createdAt
                        ? new Date(
                            String(message.createdAt)
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
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
              Введите номер телефона пользователя.
            </p>

            {/* Телефон */}

            <div className="flex items-center overflow-hidden rounded-2xl bg-black">

              <span className="px-4 text-lg font-bold text-zinc-400">
                +7
              </span>

              <input
                autoFocus
                value={newUser}
                onChange={(event) =>
                  handleNewUserChange(
                    event.target.value
                  )
                }
                placeholder="9061234567"
                inputMode="numeric"
                maxLength={10}
                className="min-w-0 flex-1 bg-transparent px-2 py-4 text-lg text-white outline-none"
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleStartNewChat();
                  }
                }}
              />

            </div>

            <p className="mt-2 text-xs text-zinc-600">
              {newUser.length}/10 цифр
            </p>

            <button
              type="button"
              disabled={
                newUser.length !== 10
              }
              onClick={
                handleStartNewChat
              }
              className={`mt-4 w-full rounded-2xl py-4 font-bold transition ${
                newUser.length === 10
                  ? "bg-yellow-400 text-black hover:scale-[1.01]"
                  : "cursor-not-allowed bg-zinc-800 text-zinc-600"
              }`}
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
                  {getUserName(
                    selectedUser
                  )}
                </span>

                {" ("}

                <span className="text-zinc-300">
                  {selectedUser}
                </span>

                {") будут удалены без возможности восстановления."}

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