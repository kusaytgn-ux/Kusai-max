import Header from "../components/layout/Header";
import OfferCard from "../components/OfferCard";
import WeeklyProducts from "../components/WeeklyProducts";
import UserCard from "../components/sections/UserCard";
import NewsSection from "../components/NewsSection";
import Iphone18Banner from "../components/Iphone18Banner";

function HomePage() {
  return (
    <div className="min-h-screen bg-black pb-28 text-white">
      <Header />

      <main className="mx-auto max-w-md space-y-6 px-5 py-5">
        <UserCard />

        <Iphone18Banner />

        <OfferCard />

        <WeeklyProducts />

        <NewsSection />
      </main>
    </div>
  );
}

export default HomePage;