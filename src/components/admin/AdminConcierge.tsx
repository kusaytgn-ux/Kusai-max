import { useMemo, useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useConcierge } from "../../store/ConciergeContext";
import ChatUserCard from "./ChatUserCard";

function AdminConcierge() {
  const { messages, sendAdminMessage } = useConcierge();

  const [selectedUser, setSelectedUser] = useState("");
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const users = useMemo(() => {
    const list = [...new Set(messages.map((m) => m.userLogin))];
    return list.filter(Boolean);
  }, [messages]);

  const chat = messages.filter(
    (m) => m.userLogin === selectedUser
  );

  useEffect(()=>{                             
    bottomRef.current?.scrollIntoView({
      behavior:"smooth",
    });
  },[chat]);

  chat.forEach((message) => {
  console.log(
    "Текст:",
    message.text,
    "| Автор:",
    message.author
  );
});

  async function handleSend() {
    if (!text.trim() || !selectedUser) return;

    await sendAdminMessage(selectedUser, text);

    setText("");
  }

  return (
    <div className="flex h-[80vh] overflow-hidden rounded-3xl bg-zinc-900">

      {/* Пользователи */}

      <div className="w-72 border-r border-zinc-800">

        <div className="border-b border-zinc-800 p-5">

          <h2 className="text-2xl font-bold">
            Клиенты
          </h2>

        </div>

        <div className="overflow-y-auto">

          {users.map((user) => (

            <ChatUserCard
            key={user}
            login={user}
            selected={selectedUser===user}
            onClick={() => setSelectedUser(user)}
            />

          ))}

        </div>

      </div>

      {/* Чат */}

      <div className="flex flex-1 flex-col">

        <div className="border-b border-zinc-800 p-5">

          <h2 className="text-2xl font-bold">

            {selectedUser || "Выберите пользователя"}

          </h2>

        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">

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
                <p>{message.text}</p>

                <span className="text-right text-xs opacity-60">
                  {message.createdAt?.toDate
                    ? message.createdAt
                      .toDate()
                      .toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
                <div ref={bottomRef}/>
              </div>

            </div>

          ))}

        </div>

        {selectedUser && (

          <div className="flex gap-3 border-t border-zinc-800 p-5">

            <input
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              placeholder="Введите сообщение..."
              className="flex-1 rounded-2xl bg-black px-5 py-3 outline-none"
            />

            <button
              onClick={handleSend}
              className="rounded-2xl bg-yellow-400 px-5"
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