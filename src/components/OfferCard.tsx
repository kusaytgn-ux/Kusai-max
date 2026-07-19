import { ArrowRight, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

function OfferCard() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-500 p-6 shadow-2xl">

      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl"></div>

      <div className="relative z-10">

        <div className="flex items-center gap-2">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-yellow-400">

            <Crown size={20} />

          </div>

          <span className="font-semibold text-black">
            Эксклюзив KUSAI MAX
          </span>

        </div>

        <h2 className="mt-5 text-3xl font-black text-black leading-tight">
          Персональное
          

          предложение
        </h2>

        <p className="mt-4 max-w-xs text-black/75">
          Только для участников клуба действует
          персональная скидка <strong>3%</strong> на
          всю технику Apple до конца недели.
        </p>

        <button
          onClick={() => navigate("/catalog")}
          className="mt-6 flex items-center gap-2 rounded-2xl bg-black px-5 py-3 font-semibold text-white transition hover:scale-105"
        >
          Смотреть предложения
          <ArrowRight size={18} />
        </button>

      </div>

    </section>
  );
}

export default OfferCard;