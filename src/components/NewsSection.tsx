import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

type ClubNews = {
  id: string;
  dateLabel: string;
  title: string;
  text: string;
  buttonText: string;
  enabled: boolean;
};

function NewsSection() {
  const [news, setNews] = useState<ClubNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch(`${API_URL}/api/club-news`);
        const data = await response.json();

        if (data.success && Array.isArray(data.news)) {
          setNews(data.news);
        } else {
          setNews([]);
        }
      } catch (error) {
        console.error("Ошибка загрузки новостей клуба:", error);
        setNews([]);
      } finally {
        setLoading(false);
      }
    }

    loadNews();
  }, []);

  if (loading || news.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">

      <h2 className="mb-5 text-2xl font-black text-white">
        Новости клуба
      </h2>

      <div className="space-y-4">

        {news.map((item) => (

          <div
            key={item.id}
            className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-yellow-400"
          >

            <div className="mb-3 flex items-center gap-2 text-yellow-400">

              <CalendarDays size={18} />

              <span className="text-sm font-semibold">
                {item.dateLabel}
              </span>

            </div>

            <h3 className="text-xl font-bold text-white">
              {item.title}
            </h3>

            <p className="mt-2 text-zinc-400">
              {item.text}
            </p>

           

          </div>

        ))}

      </div>

    </section>
  );
}

export default NewsSection;