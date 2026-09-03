import {
  Link,
  useLocation,
} from "react-router-dom";

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
    <nav
      className="
        fixed
        bottom-0
        left-0
        right-0
        z-50
        border-t
        border-yellow-400/20
        bg-black/95
        pb-[env(safe-area-inset-bottom)]
        backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto
          flex
          max-w-md
          items-center
          justify-around
          px-2
          py-2
        "
      >
        {menu.map((item) => {
          const Icon = item.icon;

          const active =
            location.pathname === item.path ||
            (
              item.path !== "/" &&
              location.pathname.startsWith(
                item.path
              )
            );

          return (
            <Link
              key={item.path}
              to={item.path}
              className="
                relative
                flex
                min-w-[58px]
                flex-1
                flex-col
                items-center
                justify-center
                gap-1
                rounded-2xl
                py-2
                transition
              "
            >
              {/* ACTIVE BACKGROUND */}

              {active && (
                <div
                  className="
                    absolute
                    inset-x-1
                    inset-y-0
                    rounded-2xl
                    bg-yellow-400
                  "
                />
              )}

              <Icon
                size={21}
                strokeWidth={active ? 2.8 : 2}
                className={`
                  relative
                  z-10
                  ${
                    active
                      ? "text-black"
                      : "text-zinc-500"
                  }
                `}
              />

              <span
                className={`
                  relative
                  z-10
                  text-[9px]
                  font-bold
                  ${
                    active
                      ? "text-black"
                      : "text-zinc-500"
                  }
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