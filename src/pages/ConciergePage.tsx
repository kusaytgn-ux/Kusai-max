import {
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";

import { useLocation } from "react-router-dom";
import { Send } from "lucide-react";

import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";

import { useConcierge } from "../store/ConciergeContext";
import { useAuth } from "../auth/AuthContext";

function ConciergePage() {
  const { user } = useAuth();
  const location = useLocation();

  const {
    messages,
    sendUserMessage,
    unreadUserCount,
    markUserMessagesAsRead,
  } = useConcierge();

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
   * ПОДСТАНОВКА ГОТОВОГО СООБЩЕНИЯ
   * =========================================================
   */

  useEffect(() => {
    if (location.state?.message) {
      setText(location.state.message);
    }
  }, [location.state]);

  /*
   * =========================================================
   * ТЕКУЩИЙ ЧАТ
   * =========================================================
   */

  const chat = useMemo(() => {
    if (!user) {
      return [];
    }

    return messages.filter(
      (message) =>
        message.userLogin === user.phone
    );
  }, [messages, user]);

  /*
   * =========================================================
   * ЗВУК ПРИ НОВОМ ОТВЕТЕ АДМИНИСТРАТОРА
   * =========================================================
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    const previous =
      previousUnreadRef.current;

    if (
      unreadUserCount > previous &&
      previous !== 0
    ) {
      playNotificationSound();
    }

    previousUnreadRef.current =
      unreadUserCount;
  }, [unreadUserCount, user]);

  /*
   * =========================================================
   * ПОМЕЧАЕМ ОТВЕТЫ ПРОЧИТАННЫМИ
   * =========================================================
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    if (unreadUserCount <= 0) {
      return;
    }

    async function markMessagesAsRead() {
      try {
        await markUserMessagesAsRead(
          user!.phone
        );
      } catch (error) {
        console.error(
          "Ошибка отметки сообщений:",
          error
        );
      }
    }

    markMessagesAsRead();
  }, [
    user,
    unreadUserCount,
    markUserMessagesAsRead,
  ]);

  /*
   * =========================================================
   * АВТОПРОКРУТКА
   * =========================================================
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat, user]);

  /*
   * =========================================================
   * ОТПРАВКА
   * =========================================================
   */

  async function handleSend() {
    const trimmedText = text.trim();

    if (!trimmedText || !user) {
      return;
    }

    try {
      await sendUserMessage(
        user.phone,
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
   * НЕ АВТОРИЗОВАН
   * =========================================================
   */

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Авторизуйтесь
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">

      <Header />

      <main className="mx-auto flex max-w-md flex-col px-5 py-5">

        {/* Заголовок */}

        <div className="mb-5 flex items-center justify-between">

          <h1 className="text-3xl font-black text-white">
            🎩 Concierge
          </h1>

          {unreadUserCount > 0 && (
            <span className="flex min-w-8 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">
              {unreadUserCount > 99
                ? "99+"
                : unreadUserCount}
            </span>
          )}

        </div>

        {/* Чат */}

        <div className="flex flex-1 flex-col gap-4">

          {chat.length === 0 && (
            <div className="rounded-3xl bg-zinc-900 p-6 text-center text-zinc-400">
              Начните переписку с администратором
            </div>
          )}

          {chat.map((message) => (

            <div
              key={message.id}
              className={`max-w-[80%] rounded-3xl px-4 py-3 ${
                message.author === "user"
                  ? "ml-auto bg-yellow-400 text-black"
                  : "bg-zinc-900 text-white"
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

      </main>

      {/* Поле ввода */}

      <div className="fixed bottom-20 left-0 right-0">

        <div className="mx-auto flex max-w-md items-center gap-3 px-5">

          <input
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="Введите сообщение..."
            className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-yellow-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className="rounded-2xl bg-yellow-400 p-3 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send
              size={20}
              className="text-black"
            />
          </button>

        </div>

      </div>

      <BottomNavigation />

    </div>
  );
}

export default ConciergePage;