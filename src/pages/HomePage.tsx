import Header from "../components/layout/Header";

import OfferCard from "../components/OfferCard";
import WeeklyProducts from "../components/WeeklyProducts";
import BottomNavigation from "../components/navigation/BottomNavigation";
import UserCard from "../components/sections/UserCard";



import NewsSection from "../components/NewsSection";

function HomePage() {
  
  return (
    <div className="min-h-screen bg-black pb-28">

      <Header />

      <main className="mx-auto max-w-md space-y-6 px-5 py-5">

        <UserCard />
      

        <OfferCard />

        <WeeklyProducts />
        <NewsSection />

      </main>

      <BottomNavigation />

    </div>
  );
}

export default HomePage;