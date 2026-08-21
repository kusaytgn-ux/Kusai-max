import {
  useState,
  useRef,
  useEffect,
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
    markMessagesAsRead,
  } = useConcierge();

  const [text, setText] = useState("");

  const bottomRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const touchStartY =
    useRef(0);

  useEffect(() => {
    if (location.state?.message) {
      setText(location.state.message);
    }
  }, [location.state]);

  /*
   * Помечаем сообщения администратора
   * как прочитанные при открытии Concierge.
   */
  useEffect(() => {
    if (!user?.phone) {
      return;
    }

    markMessagesAsRead(user.phone).catch(
      (error) => {
        console.error(
          "Ошибка отметки сообщений как прочитанных:",
          error
        );
      }
    );
  }, [user?.phone, messages]);

  /*
   * Автоматически прокручиваем чат вниз.
   */
  const chat = messages.filter(
    (message) =>
      message.userLogin === user?.phone
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Авторизуйтесь
      </div>
    );
  }

  async function handleSend() {
    if (!text.trim() || !user) {
      return;
    }

    try {
      await sendUserMessage(
        user.phone,
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

  return (
    <div className="min-h-screen bg-black pb-24">

      <Header />

      <main className="mx-auto flex max-w-md flex-col px-5 py-5">

        <h1 className="mb-5 text-3xl font-black text-white">
          🎩 Concierge
        </h1>

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

          <div ref={bottomRef} />

        </div>

      </main>

      <div className="fixed bottom-20 left-0 right-0">

        <div className="mx-auto flex max-w-md items-center gap-3 px-5">

          <input
            ref={inputRef}
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            placeholder="Введите сообщение..."
            onTouchStart={(event) => {
              touchStartY.current =
                event.touches[0].clientY;
            }}
            onTouchMove={(event) => {
              const currentY =
                event.touches[0].clientY;

              if (
                currentY -
                  touchStartY.current >
                  20 &&
                document.activeElement ===
                  inputRef.current
              ) {
                inputRef.current?.blur();
              }
            }}
            className="
              flex-1
              rounded-2xl
              bg-zinc-900
              px-4
              py-3
              text-white
              outline-none
            "
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSend();
              }
            }}
          />

          <button
            type="button"
            onClick={handleSend}
            className="rounded-2xl bg-yellow-400 p-3"
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