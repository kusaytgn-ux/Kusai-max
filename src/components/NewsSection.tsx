import { CalendarDays, ArrowRight } from "lucide-react";

function NewsSection() {
  const news = [
    {
      title: "Закрытая презентация Apple",
      text: "Участники KUSAI MAX первыми увидят новые устройства.",
      date: "25 июля",
    },
    {
      title: "Двойные бонусы",
      text: "До конца недели начисляем x2 бонусов за покупки.",
      date: "До 30 июля",
    },
    {
      title: "Premium Concierge",
      text: "Теперь доступна персональная видеоконсультация.",
      date: "Новинка",
    },
  ];

  return (
    <section className="mt-8">

      <h2 className="mb-5 text-2xl font-black text-white">
        Новости клуба
      </h2>

      <div className="space-y-4">

        {news.map((item) => (

          <div
            key={item.title}
            className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-yellow-400"
          >

            <div className="mb-3 flex items-center gap-2 text-yellow-400">

              <CalendarDays size={18} />

              <span className="text-sm font-semibold">
                {item.date}
              </span>

            </div>

            <h3 className="text-xl font-bold text-white">
              {item.title}
            </h3>

            <p className="mt-2 text-zinc-400">
              {item.text}
            </p>

            <button className="mt-4 flex items-center gap-2 text-yellow-400 font-semibold">
              Подробнее
              <ArrowRight size={16} />
            </button>

          </div>

        ))}

      </div>

    </section>
  );
}

export default NewsSection;