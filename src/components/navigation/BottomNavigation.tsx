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
    <nav className="kusai-bottom-nav">

      <div className="kusai-bottom-nav-inner">

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
              className={`kusai-nav-item ${
                active ? "active" : ""
              }`}
            >
              <Icon
                strokeWidth={2.2}
              />

              <span>
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