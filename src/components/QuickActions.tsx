import {
  ShoppingBag,
  RefreshCcw,
  Headphones,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Каталог",
      subtitle: "Все устройства",
      icon: ShoppingBag,
      path: "/catalog",
    },
    {
      title: "Trade-In",
      subtitle: "Оценить устройство",
      icon: RefreshCcw,
      path: "/tradein",
    },
    {
      title: "Concierge",
      subtitle: "Персональный менеджер",
      icon: Headphones,
      path: "/concierge",
    },
    {
      title: "AI Select",
      subtitle: "Подбор техники",
      icon: Sparkles,
      path: "/select",
    },
  ];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Быстрые действия
        </h2>

        <span className="text-sm text-zinc-500">
          KUSAI MAX
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-all duration-300 hover:border-yellow-400 hover:bg-zinc-800"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-black">
                <Icon size={24} />
              </div>

              <h3 className="font-bold text-white">
                {action.title}
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                {action.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;