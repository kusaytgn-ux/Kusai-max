import { Link, useLocation } from "react-router-dom";
import {
  House,
  ShoppingBag,
  Star,
  Repeat,
  ShoppingCart,
} from "lucide-react";

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
      </div>
    </nav>
  );
}

export default BottomNavigation;