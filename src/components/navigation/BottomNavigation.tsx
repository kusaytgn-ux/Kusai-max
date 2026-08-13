import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  House,
  ShoppingBag,
  Star,
  Repeat,
  ShoppingCart,
  MessageCircle,
} from "lucide-react";

import { collection, onSnapshot } from "firebase/firestore";

import { db } from "../../firebase/firebase";
import { useAuth } from "../../auth/AuthContext";

const menu = [
  {
    title: "Главная",
    icon: House,
    path: "/",
  },
  {
    title: "Каталог",
    icon: ShoppingBag,
    path: "/catalog",
  },
  {
    title: "Select",
    icon: Star,
    path: "/select",
  },
  {
    title: "Trade-In",
    icon: Repeat,
    path: "/tradein",
  },
  {
    title: "Корзина",
    icon: ShoppingCart,
    path: "/cart",
  },
];

function BottomNavigation() {
  const location = useLocation();
  const { user } = useAuth();

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user?.phone) {
      setUnreadMessages(0);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "messages"),
      (snapshot) => {
        const messages = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }));

        const readTimestamp = Number(
          localStorage.getItem(
            `concierge_read_${user.phone}`
          ) || 0
        );

        let unreadCount = 0;

        messages.forEach((message: any) => {
          if (
            message.userLogin !== user.phone ||
            message.author !== "admin"
          ) {
            return;
          }

          const createdAt =
            message.createdAt?.toMillis?.() ??
            (message.createdAt?.seconds
              ? message.createdAt.seconds * 1000
              : 0);

          if (createdAt > readTimestamp) {
            unreadCount++;
          }
        });

        setUnreadMessages(unreadCount);
      },
      (error) => {
        console.error(
          "Ошибка получения сообщений:",
          error
        );
      }
    );

    return unsubscribe;
  }, [user?.phone]);

  /*
   * Когда пользователь открывает Concierge,
   * считаем все текущие сообщения прочитанными.
   */
  useEffect(() => {
    if (
      location.pathname === "/concierge" &&
      user?.phone
    ) {
      localStorage.setItem(
        `concierge_read_${user.phone}`,
        Date.now().toString()
      );

      setUnreadMessages(0);
    }
  }, [location.pathname, user?.phone]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center justify-around py-3">
        {menu.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1"
            >
              <Icon
                size={22}
                className={
                  active
                    ? "text-yellow-400"
                    : "text-zinc-500"
                }
              />

              <span
                className={`text-xs ${
                  active
                    ? "text-yellow-400"
                    : "text-zinc-500"
                }`}
              >
                {item.title}
              </span>
            </Link>
          );
        })}

        {/* Concierge */}
        <Link
          to="/concierge"
          className="relative flex flex-col items-center gap-1"
        >
          <div className="relative">
            <MessageCircle
              size={22}
              className={
                location.pathname === "/concierge"
                  ? "text-yellow-400"
                  : "text-zinc-500"
              }
            />

            {unreadMessages > 0 && (
              <span
                className="
                  absolute
                  -right-3
                  -top-3
                  flex
                  min-h-[18px]
                  min-w-[18px]
                  items-center
                  justify-center
                  rounded-full
                  bg-red-500
                  px-1
                  text-[10px]
                  font-black
                  leading-none
                  text-white
                "
              >
                {unreadMessages > 99
                  ? "99+"
                  : unreadMessages}
              </span>
            )}
          </div>

          <span
            className={`text-xs ${
              location.pathname === "/concierge"
                ? "text-yellow-400"
                : "text-zinc-500"
            }`}
          >
            Concierge
          </span>
        </Link>
      </div>
    </nav>
  );
}

export default BottomNavigation;