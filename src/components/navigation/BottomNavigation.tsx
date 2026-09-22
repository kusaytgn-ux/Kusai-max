
import { Link, useLocation } from "react-router-dom";
import {
  House,
  ShoppingBag,
  Star,
  Repeat,
  ShoppingCart,
} from "lucide-react";

import { motion } from "framer-motion";

const menu = [
  { title: "Главная", icon: House, path: "/" },
  { title: "Каталог", icon: ShoppingBag, path: "/catalog" },
  { title: "Select", icon: Star, path: "/select" },
  { title: "Trade-In", icon: Repeat, path: "/tradein" },
  { title: "Корзина", icon: ShoppingCart, path: "/cart" },
];

function BottomNavigation() {
  const location = useLocation();

  const activeIndex = menu.findIndex((item) => {
    if (item.path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + "/")
    );
  });

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        border-t border-yellow-400/20
        bg-black/95
        pb-[env(safe-area-inset-bottom)]
        backdrop-blur-xl
      "
    >
      <div
        className="
          relative mx-auto flex max-w-md
          items-center justify-around px-2 py-2
        "
      >
        {/* Жёлтый фон, который перемещается */}
        {activeIndex !== -1 && (
          <motion.div
            className="
              absolute inset-y-2
              rounded-2xl bg-yellow-400
            "
            style={{
              width: "calc((100% - 16px) / 5)",
              left: "8px",
            }}
            animate={{
              x: `calc(${activeIndex} * 100%)`,
            }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 32,
            }}
          />
        )}

        {menu.map((item) => {
          const Icon = item.icon;

          const active =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");

          return (
            <Link
              key={item.path}
              to={item.path}
              className="
                relative z-10 flex min-w-0 flex-1
                flex-col items-center justify-center
                gap-1 rounded-2xl py-2
              "
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.8 : 2}
                className={
                  active ? "text-black" : "text-zinc-500"
                }
              />

              <span
                className={`
                  text-[9px] font-bold
                  ${active ? "text-black" : "text-zinc-500"}
                `}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;