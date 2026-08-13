import { useMemo, useState, useRef, useEffect } from "react";
import { Send, Trash2, Plus } from "lucide-react";

import { useConcierge } from "../../store/ConciergeContext";

import { db } from "../../firebase/firebase";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import ChatUserCard from "./ChatUserCard";

function AdminConcierge() {
  const {
    messages,
    sendAdminMessage,
  } = useConcierge();

  const [selectedUser, setSelectedUser] =
    useState("");

  const [text, setText] = useState("");

  const [newUser, setNewUser] =
    useState("");

  const [showNewChat, setShowNewChat] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  /*
   * ==========================================
   * Список пользователей, с которыми уже есть
   * сообщения
   * ==========================================
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
   * ==========================================
   * Сообщения выбранного пользователя
   * ==========================================
   */

  const chat = messages.filter(
    (message) =>
      message.userLogin === selectedUser
  );

  /*
   * ==========================================
   * Автопрокрутка
   * ==========================================
   */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat]);

  /*
   * ==========================================
   * Отправить сообщение
   * ==========================================
   */

  async function handleSend() {
    if (
      !text.trim() ||
      !selectedUser
    ) {
      return;
    }

    try {
      await sendAdminMessage(
        selectedUser,
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
   * ==========================================
   * Начать новый чат
   * ==========================================
   */

  function handleStartNewChat() {
    const login = newUser.trim();

    if (!login) {
      return;
    }

    setSelectedUser(login);
    setNewUser("");
    setShowNewChat(false);
  }

  /*
   * ==========================================
   * Удалить весь чат
   * ==========================================
   */

  async function handleDeleteChat() {
    if (!selectedUser) {
      return;
    }

    const confirmed = window.confirm(
      `Удалить весь чат с пользователем ${selectedUser}?\n\nВсе сообщения этого чата будут удалены без возможности восстановления.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      /*
       * Находим все сообщения выбранного пользователя
       */

      const q = query(
        collection(db, "messages"),
        where(
          "userLogin",
          "==",
          selectedUser
        )
      );

      const snapshot = await getDocs(q);

      /*
       * Удаляем все документы чата
       */

      await Promise.all(
        snapshot.docs.map((messageDoc) =>
          deleteDoc(
            doc(
              db,
              "messages",
              messageDoc.id
            )
          )
        )
      );

      /*
       * Закрываем выбранный чат
       */

      setSelectedUser("");
      setText("");
    } catch (error) {
      console.error(
        "Ошибка удаления чата:",
        error
      );

      alert(
        "Не удалось удалить чат."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-[80vh] overflow-hidden rounded-3xl bg-zinc-900">

      {/* ===================================== */}
      {/* Пользователи */}
      {/* ===================================== */}

      <div className="w-72 border-r border-zinc-800">

        <div className="border-b border-zinc-800 p-5">

          <div className="flex items-center justify-between">

            <h2 className="text-2xl font-bold">
              Клиенты
            </h2>

            <button
              type="button"
              onClick={() =>
                setShowNewChat(
                  !showNewChat
                )
              }
              className="rounded-xl bg-yellow-400 p-2 text-black transition hover:bg-yellow-300"
              title="Начать новый чат"
            >
              <Plus size={20} />
            </button>

          </div>

          {/* Новый чат */}

          {showNewChat && (
            <div className="mt-4 space-y-3">

              <input
                value={newUser}
                onChange={(e) =>
                  setNewUser(
                    e.target.value
                  )
                }
                placeholder="Телефон пользователя"
                className="w-full rounded-xl bg-black px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-yellow-400"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter"
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
                className="w-full rounded-xl bg-yellow-400 py-2 font-bold text-black transition hover:bg-yellow-300"
              >
                Открыть чат
              </button>

            </div>
          )}

        </div>

        <div className="overflow-y-auto">

          {users.length === 0 && (
            <div className="p-5 text-center text-sm text-zinc-500">
              Пока нет чатов
            </div>
          )}

          {users.map((user) => (

            <ChatUserCard
              key={user}
              login={user}
              selected={
                selectedUser === user
              }
              onClick={() =>
                setSelectedUser(user)
              }
            />

          ))}

        </div>

      </div>

      {/* ===================================== */}
      {/* Чат */}
      {/* ===================================== */}

      <div className="flex flex-1 flex-col">

        {/* Заголовок */}

        <div className="flex items-center justify-between border-b border-zinc-800 p-5">

          <h2 className="text-2xl font-bold">
            {selectedUser ||
              "Выберите пользователя"}
          </h2>

          {selectedUser && (
            <button
              type="button"
              onClick={
                handleDeleteChat
              }
              disabled={deleting}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={18} />

              {deleting
                ? "Удаление..."
                : "Удалить чат"}
            </button>
          )}

        </div>

        {/* Сообщения */}

        <div className="flex-1 space-y-4 overflow-y-auto p-5">

          {!selectedUser && (
            <div className="flex h-full items-center justify-center text-zinc-500">
              Выберите пользователя
              или начните новый чат
            </div>
          )}

          {selectedUser &&
            chat.length === 0 && (
              <div className="flex h-full items-center justify-center">

                <div className="max-w-sm text-center">

                  <p className="text-lg font-semibold text-white">
                    Чат пока пуст
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    Вы можете написать
                    пользователю первым.
                  </p>

                </div>

              </div>
            )}

          {chat.map((message) => (

            <div
              key={message.id}
              className={`max-w-[70%] rounded-3xl px-5 py-3 ${
                message.author ===
                "admin"
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

        </div>

        {/* ================================= */}
        {/* Поле отправки */}
        {/* ================================= */}

        {selectedUser && (

          <div className="flex gap-3 border-t border-zinc-800 p-5">

            <input
              value={text}
              onChange={(e) =>
                setText(
                  e.target.value
                )
              }
              placeholder="Введите сообщение..."
              className="flex-1 rounded-2xl bg-black px-5 py-3 text-white outline-none focus:ring-2 focus:ring-yellow-400"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  handleSend();
                }
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim()}
              className="rounded-2xl bg-yellow-400 px-5 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <Send className="text-black" />

            </button>

          </div>

        )}

      </div>

    </div>
  );
}

export default AdminConcierge;
