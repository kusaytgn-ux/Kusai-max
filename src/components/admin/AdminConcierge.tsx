import {
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";

import { Send } from "lucide-react";

import { useConcierge } from "../../store/ConciergeContext";
import ChatUserCard from "./ChatUserCard";

function AdminConcierge() {
  const {
    messages,
    sendAdminMessage,
    unreadAdminCount,
    markAdminMessagesAsRead,
  } = useConcierge();

  const [selectedUser, setSelectedUser] =
    useState("");

  const [text, setText] = useState("");

  const bottomRef =
    useRef<HTMLDivElement>(null);

  /*
   * =========================================================
   * ЗВУКОВОЕ УВЕДОМЛЕНИЕ
   * =========================================================
   */

  const previousUnreadRef = useRef(0);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  function playNotificationSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContextClass();
      }

      const audioContext =
        audioContextRef.current;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator =
        audioContext.createOscillator();

      const gain =
        audioContext.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );

      oscillator.frequency.setValueAtTime(
        660,
        audioContext.currentTime + 0.12
      );

      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.18,
        audioContext.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.25
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();

      oscillator.stop(
        audioContext.currentTime + 0.25
      );
    } catch (error) {
      console.error(
        "Ошибка звукового уведомления:",
        error
      );
    }
  }

  /*
   * =========================================================
   * СПИСОК ПОЛЬЗОВАТЕЛЕЙ
   * =========================================================
   */

  const users = useMemo(() => {
    const list = [
      ...new Set(
        messages.map(
          (message) => message.userLogin
        )
      ),
    ];

    return list.filter(Boolean);
  }, [messages]);

  /*
   * =========================================================
   * ТЕКУЩИЙ ЧАТ
   * =========================================================
   */

  const chat = useMemo(() => {
    return messages.filter(
      (message) =>
        message.userLogin === selectedUser
    );
  }, [messages, selectedUser]);

  /*
   * =========================================================
   * ЗВУК ПРИ НОВОМ СООБЩЕНИИ
   * =========================================================
   */

  useEffect(() => {
    const previous =
      previousUnreadRef.current;

    if (
      unreadAdminCount > previous &&
      previous !== 0
    ) {
      playNotificationSound();
    }

    previousUnreadRef.current =
      unreadAdminCount;
  }, [unreadAdminCount]);

  /*
   * =========================================================
   * АВТОПРОКРУТКА
   * =========================================================
   */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat]);

  /*
   * =========================================================
   * ВЫБОР ПОЛЬЗОВАТЕЛЯ
   * =========================================================
   */

  async function handleSelectUser(
    userLogin: string
  ) {
    setSelectedUser(userLogin);

    try {
      await markAdminMessagesAsRead(
        userLogin
      );
    } catch (error) {
      console.error(
        "Ошибка отметки сообщений:",
        error
      );
    }
  }

  /*
   * =========================================================
   * ОТПРАВКА
   * =========================================================
   */

  async function handleSend() {
    const trimmedText = text.trim();

    if (!trimmedText || !selectedUser) {
      return;
    }

    try {
      await sendAdminMessage(
        selectedUser,
        trimmedText
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
   * =========================================================
   * ENTER
   * =========================================================
   */

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[80vh] overflow-hidden rounded-3xl bg-zinc-900">

      {/* =====================================================
          ПОЛЬЗОВАТЕЛИ
          ===================================================== */}

      <div className="w-72 border-r border-zinc-800">

        <div className="flex items-center justify-between border-b border-zinc-800 p-5">

          <h2 className="text-2xl font-bold">
            Клиенты
          </h2>

          {unreadAdminCount > 0 && (
            <span className="flex min-w-7 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">
              {unreadAdminCount > 99
                ? "99+"
                : unreadAdminCount}
            </span>
          )}

        </div>

        <div className="overflow-y-auto">

          {users.length === 0 ? (

            <div className="p-5 text-center text-sm text-zinc-500">
              Пока нет сообщений
            </div>

          ) : (

            users.map((user) => {

              const unreadForUser =
                messages.filter(
                  (message) =>
                    message.userLogin === user &&
                    message.author === "user" &&
                    message.read === false
                ).length;

              return (
                <div
                  key={user}
                  className="relative"
                >

                  <ChatUserCard
                    login={user}
                    selected={
                      selectedUser === user
                    }
                    onClick={() =>
                      handleSelectUser(user)
                    }
                  />

                  {unreadForUser > 0 && (
                    <span className="pointer-events-none absolute right-3 top-1/2 flex min-w-6 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 px-1.5 py-1 text-xs font-black text-white">
                      {unreadForUser > 99
                        ? "99+"
                        : unreadForUser}
                    </span>
                  )}

                </div>
              );
            })
          )}

        </div>

      </div>

      {/* =====================================================
          ЧАТ
          ===================================================== */}

      <div className="flex flex-1 flex-col">

        <div className="flex items-center justify-between border-b border-zinc-800 p-5">

          <h2 className="text-2xl font-bold">
            {selectedUser ||
              "Выберите пользователя"}
          </h2>

          {selectedUser && (
            <span className="text-sm text-zinc-500">
              Онлайн-чат
            </span>
          )}

        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">

          {!selectedUser ? (

            <div className="flex h-full items-center justify-center text-center text-zinc-500">
              Выберите пользователя,
              чтобы открыть чат
            </div>

          ) : chat.length === 0 ? (

            <div className="flex h-full items-center justify-center text-center text-zinc-500">
              Сообщений пока нет
            </div>

          ) : (

            chat.map((message) => (

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

            ))

          )}

          <div ref={bottomRef} />

        </div>

        {selectedUser && (

          <div className="flex gap-3 border-t border-zinc-800 p-5">

            <input
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Введите сообщение..."
              className="flex-1 rounded-2xl bg-black px-5 py-3 text-white outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-yellow-400"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim()}
              className="rounded-2xl bg-yellow-400 px-5 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
            >

              <Send
                size={20}
                className="text-black"
              />

            </button>

          </div>

        )}

      </div>

    </div>
  );
}

export default AdminConcierge;