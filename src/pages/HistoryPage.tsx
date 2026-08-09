import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";

function HistoryPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-8">
        <h2 className="text-3xl font-bold text-white">
          История
        </h2>
      </main>

      <BottomNavigation />
    </div>
  );
}

export default HistoryPage;