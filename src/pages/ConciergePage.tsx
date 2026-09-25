import {
  useState,
  useRef,
  useEffect,
} from "react";

import BackButton from "../components/ui/BackButton";

import { useLocation } from "react-router-dom";
import { Send } from "lucide-react";

import Header from "../components/layout/Header";

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

  /*
   * Высота видимой области экрана.
   *
   * На iPhone при открытии клавиатуры
   * visualViewport уменьшается.
   * Благодаря этому нижняя часть чата
   * автоматически поднимается над клавиатурой.
   */
  const [viewportHeight, setViewportHeight] =
    useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const updateViewportHeight = () => {
      setViewportHeight(viewport.height);
    };

    updateViewportHeight();

    viewport.addEventListener(
      "resize",
      updateViewportHeight
    );

    viewport.addEventListener(
      "scroll",
      updateViewportHeight
    );

    return () => {
      viewport.removeEventListener(
        "resize",
        updateViewportHeight
      );

      viewport.removeEventListener(
        "scroll",
        updateViewportHeight
      );
    };
  }, []);

  /*
   * Если сообщение передали через navigate(),
   * подставляем его в поле ввода.
   */
  useEffect(() => {
    if (location.state?.message) {
      setText(location.state.message);
    }
  }, [location.state]);

  /*
   * Помечаем сообщения администратора
   * как прочитанные.
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
   * Только сообщения текущего пользователя.
   */
  const chat = messages.filter(
    (message) =>
      message.userLogin === user?.phone
  );

  /*
   * Прокручиваем именно область чата,
   * а не всю страницу.
   */
  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
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

      /*
       * После отправки возвращаем фокус
       * в поле, чтобы клавиатура не закрывалась.
       */
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } catch (error) {
      console.error(
        "Ошибка отправки сообщения:",
        error
      );
    }
  }

  return (
    <div
      className="
        flex
        w-full
        flex-col
        overflow-hidden
        bg-black
      "
      style={{
        height: viewportHeight
          ? `${viewportHeight}px`
          : "100dvh",
      }}
    >

      {/* HEADER */}

      <div className="shrink-0">
        <Header />
      </div>

      {/* ОСНОВНАЯ ОБЛАСТЬ */}

      <main
        className="
          mx-auto
          flex
          min-h-0
          w-full
          max-w-md
          flex-1
          flex-col
          px-5
          pt-5
        "
      >

        {/* НАЗАД */}

        <div className="shrink-0">
          <BackButton />
        </div>

        {/* ЗАГОЛОВОК */}

        <h1
          className="
            mb-5
            shrink-0
            text-3xl
            font-black
            text-white
          "
        >
          🎩 Concierge
        </h1>

        {/* ЧАТ */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            pb-4
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >

          <div className="flex flex-col gap-4">

            {chat.length === 0 && (
              <div
                className="
                  rounded-3xl
                  bg-zinc-900
                  p-6
                  text-center
                  text-zinc-400
                "
              >
                Начните переписку с администратором
              </div>
            )}

            {chat.map((message) => (
              <div
                key={message.id}
                className={`
                  max-w-[80%]
                  rounded-3xl
                  px-4
                  py-3
                  ${
                    message.author === "user"
                      ? "ml-auto bg-yellow-400 text-black"
                      : "bg-zinc-900 text-white"
                  }
                `}
              >

                <div className="flex flex-col gap-2">

                  <p>
                    {message.text}
                  </p>

                  <span
                    className="
                      text-right
                      text-xs
                      opacity-60
                    "
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

            {/* Точка прокрутки вниз */}

            <div ref={bottomRef} />

          </div>

        </div>

        {/* ПОЛЕ ВВОДА */}

        <div
          className="
            shrink-0
            bg-black
            py-3
          "
        >

          <div
            className="
              flex
              w-full
              items-center
              gap-3
            "
          >

            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              placeholder="Введите сообщение..."
              autoComplete="off"
              autoCorrect="on"
              autoCapitalize="sentences"
              inputMode="text"
              enterKeyHint="send"
              className="
                min-w-0
                flex-1
                rounded-2xl
                bg-zinc-900
                px-4
                py-3
                text-white
                outline-none
                placeholder:text-zinc-500
                focus:ring-1
                focus:ring-yellow-400/40
              "
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              className="
                flex
                h-[52px]
                w-[52px]
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-yellow-400
                text-black
                active:scale-95
              "
              aria-label="Отправить сообщение"
            >
              <Send
                size={21}
                className="text-black"
              />
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default ConciergePage;