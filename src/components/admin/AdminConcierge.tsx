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

  const [selectedUser, setSelectedUser] = useState("");
  const [text, setText] = useState("");
  const [newUser, setNewUser] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const phones = Array.from(
          new Set(
            messages
              .map((message) => message.userLogin)
              .filter(Boolean)
          )
        );

        const names: Record<string, string> = {};

        await Promise.all(
          phones.map(async (phone) => {
            try {
              const response = await fetch(
                `${
                  (
                    import.meta.env.VITE_API_URL ||
                    "http://localhost:3001"
                  ).replace(/\/$/, "")
                }/api/clients/phone/${encodeURIComponent(phone)}`
              );

              if (!response.ok) {
                return;
              }

              const data = await response.json();

              if (data.success) {
                names[phone] =
                  data.client?.name || "Пользователь";
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

  const users = useMemo(() => {
    const list = [
      ...new Set(
        messages
          .map((message) => message.userLogin)
          .filter(Boolean)
      ),
    ];

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

  function getUserName(phone: string) {
    return (
      userNames[phone] ||
      "Пользователь"
    );
  }

  const chat = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.userLogin ===
          selectedUser
      ),
    [messages, selectedUser]
  );

  const totalUnread =
    getTotalUnreadForAdmin();

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

  function handleNewUserChange(
    value: string
  ) {
    const digits =
      value.replace(/\D/g, "");

    const limited =
      digits.slice(0, 10);

    setNewUser(limited);
  }

  function handleStartNewChat() {
    if (newUser.length !== 10) {
      return;
    }

    const phone =
      `+7${newUser}`;

    setSelectedUser(phone);
    setNewUser("");
    setShowNewChat(false);
  }

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
    <div className="flex h-[80vh] min-h-0 overflow-hidden rounded-[28px] border border-zinc-800 bg-black shadow-2xl">

      {/* ========================= */}
      {/* ЛЕВАЯ КОЛОНКА */}
      {/* ========================= */}

      <div className="flex w-80 min-h-0 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">

        {/* Заголовок */}

        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 p-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#A8FF00] text-black">
              <MessageCircle size={22} strokeWidth={2.5} />
            </div>

            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <h2 className="truncate text-xl font-black text-white">
                  Concierge
                </h2>

                {totalUnread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EC008C] px-1.5 text-[10px] font-black text-white">
                    {totalUnread > 99
                      ? "99+"
                      : totalUnread}
                  </span>
                )}

              </div>

              <p className="mt-0.5 text-xs text-zinc-500">
                {totalUnread > 0
                  ? `${totalUnread} новых сообщений`
                  : "Нет новых сообщений"}
              </p>

            </div>

          </div>

          {/* Новый чат */}

          <button
            type="button"
            onClick={() =>
              setShowNewChat(true)
            }
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-[#A8FF00]
              text-black
              transition
              hover:scale-105
              hover:bg-[#baff32]
              active:scale-95
            "
            title="Новый чат"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>

        </div>

        {/* Список пользователей */}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">

          {users.length === 0 ? (

            <div className="flex h-full flex-col items-center justify-center px-6 text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900">

                <MessageCircle
                  size={28}
                  className="text-zinc-600"
                />

              </div>

              <p className="mt-4 text-sm font-semibold text-zinc-500">
                Пока нет чатов
              </p>

            </div>

          ) : (

            <div className="space-y-2">

              {users.map((phone) => {

                const unread =
                  getUnreadForAdmin(phone);

                const name =
                  getUserName(phone);

                const selected =
                  selectedUser === phone;

                return (

                  <button
                    key={phone}
                    type="button"
                    onClick={() => {
                      setSelectedUser(phone);
                    }}
                    className={`
                      relative
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-2xl
                      border
                      p-3
                      text-left
                      transition
                      ${
                        selected
                          ? "border-[#A8FF00]/40 bg-[#A8FF00]/10"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800"
                      }
                    `}
                  >

                    {/* Аватар */}

                    <div
                      className={`
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        text-lg
                        font-black
                        ${
                          selected
                            ? "bg-[#A8FF00] text-black"
                            : "bg-zinc-800 text-zinc-300"
                        }
                      `}
                    >
                      {name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    {/* Имя */}

                    <div className="min-w-0 flex-1">

                      <p
                        className={`
                          truncate
                          text-sm
                          font-bold
                          ${
                            selected
                              ? "text-white"
                              : "text-zinc-200"
                          }
                        `}
                      >
                        {name}
                      </p>

                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {phone}
                      </p>

                    </div>

                    {/* Непрочитанные */}

                    {unread > 0 && (

                      <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#EC008C] px-1.5 text-[10px] font-black text-white">
                        {unread > 99
                          ? "99+"
                          : unread}
                      </span>

                    )}

                  </button>

                );
              })}

            </div>

          )}

        </div>

      </div>

      {/* ========================= */}
      {/* ПРАВАЯ КОЛОНКА */}
      {/* ========================= */}

      <div className="flex min-w-0 min-h-0 flex-1 flex-col bg-black">

        {/* Заголовок чата */}

        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 p-5">

          <div className="min-w-0">

            <h2 className="truncate text-xl font-black text-white">

              {selectedUser
                ? getUserName(
                    selectedUser
                  )
                : "Выберите пользователя"}

            </h2>

            {selectedUser && (

              <p className="mt-1 text-xs text-zinc-500">

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
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-zinc-800
                bg-zinc-900
                text-zinc-500
                transition
                hover:border-red-500/40
                hover:bg-red-500/10
                hover:text-red-400
              "
              title="Удалить чат"
            >
              <Trash2 size={18} />
            </button>

          )}

        </div>

        {/* Сообщения */}

        <div className="min-h-0 flex-1 overflow-y-auto bg-black p-6">

          {!selectedUser ? (

            <div className="flex h-full flex-col items-center justify-center">

              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-zinc-800 bg-zinc-950">

                <MessageCircle
                  size={34}
                  className="text-zinc-700"
                />

              </div>

              <p className="mt-5 text-sm font-semibold text-zinc-600">
                Выберите пользователя
              </p>

            </div>

          ) : chat.length === 0 ? (

            <div className="flex h-full flex-col items-center justify-center">

              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-zinc-800 bg-zinc-950">

                <MessageCircle
                  size={34}
                  className="text-zinc-700"
                />

              </div>

              <p className="mt-5 text-center text-sm text-zinc-500">

                Сообщений пока нет.
                <br />
                Напишите пользователю первым.

              </p>

            </div>

          ) : (

            <div className="mx-auto max-w-4xl space-y-4">

              {chat.map((message) => (

                <div
                  key={message.id}
                  className={`
                    flex
                    ${
                      message.author ===
                      "admin"
                        ? "justify-end"
                        : "justify-start"
                    }
                  `}
                >

                  <div
                    className={`
                      max-w-[70%]
                      rounded-[22px]
                      border
                      px-5
                      py-3.5
                      shadow-lg
                      ${
                        message.author ===
                        "admin"
                          ? "border-[#A8FF00]/30 bg-[#A8FF00] text-black"
                          : "border-zinc-800 bg-zinc-900 text-white"
                      }
                    `}
                  >

                    <p className="text-sm leading-relaxed">
                      {message.text}
                    </p>

                    <span
                      className={`
                        mt-2
                        block
                        text-right
                        text-[10px]
                        ${
                          message.author ===
                          "admin"
                            ? "text-black/50"
                            : "text-zinc-500"
                        }
                      `}
                    >
                      {message.createdAt
                        ? new Date(
                            String(
                              message.createdAt
                            )
                          ).toLocaleTimeString(
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

            </div>

          )}

        </div>

        {/* Поле отправки */}

        {selectedUser && (

          <div className="flex shrink-0 gap-3 border-t border-zinc-800 bg-zinc-950 p-4">

            <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-zinc-800 bg-black px-4 transition focus-within:border-[#A8FF00]/50">

              <input
                value={text}
                onChange={(event) =>
                  setText(
                    event.target.value
                  )
                }
                placeholder="Введите сообщение..."
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  py-3
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-zinc-600
                "
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleSend();
                  }
                }}
              />

            </div>

            <button
              type="button"
              onClick={handleSend}
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-[#A8FF00]
                text-black
                transition
                hover:scale-105
                hover:bg-[#baff32]
                active:scale-95
              "
              title="Отправить"
            >
              <Send size={19} strokeWidth={2.5} />
            </button>

          </div>

        )}

      </div>

      {/* ========================= */}
      {/* НОВЫЙ ЧАТ */}
      {/* ========================= */}

      {showNewChat && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-[28px] border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8FF00]">
                  Concierge
                </p>

                <h3 className="mt-1 text-2xl font-black text-white">
                  Новый чат
                </h3>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNewChat(false)
                }
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-zinc-800
                  bg-zinc-900
                  text-zinc-500
                  transition
                  hover:bg-zinc-800
                  hover:text-white
                "
              >
                <X size={19} />
              </button>

            </div>

            <p className="mb-4 text-sm text-zinc-500">
              Введите номер телефона пользователя.
            </p>

            {/* Телефон */}

            <div className="flex items-center overflow-hidden rounded-2xl border border-zinc-800 bg-black focus-within:border-[#A8FF00]/50">

              <span className="px-4 text-lg font-black text-zinc-500">
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
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  px-2
                  py-4
                  text-lg
                  text-white
                  outline-none
                  placeholder:text-zinc-700
                "
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
              className={`
                mt-5
                w-full
                rounded-2xl
                py-4
                text-sm
                font-black
                transition
                ${
                  newUser.length === 10
                    ? "bg-[#A8FF00] text-black hover:scale-[1.01] hover:bg-[#baff32]"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-600"
                }
              `}
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

          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm">

            <div className="w-full max-w-md rounded-[28px] border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <Trash2 size={22} />
              </div>

              <h3 className="mt-5 text-2xl font-black text-white">
                Удалить чат?
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-zinc-500">

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
                  className="
                    flex-1
                    rounded-2xl
                    border
                    border-zinc-800
                    bg-zinc-900
                    py-3
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-zinc-800
                  "
                >
                  Отмена
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeleteChat
                  }
                  className="
                    flex-1
                    rounded-2xl
                    bg-red-500
                    py-3
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-red-600
                  "
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