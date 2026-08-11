import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function WelcomePage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6">

      <div className="w-full max-w-lg text-center">

        <h1 className="text-6xl font-black tracking-widest text-yellow-400">
          KUSAI
        </h1>

        <h2 className="mt-2 text-4xl font-black text-white">
          MAX
        </h2>

        <p className="mt-8 text-lg text-zinc-400">
          Премиальная техника
          

          
        </p>

        <div className="mt-14 space-y-4">

          <Link
            to="/login"
            className="block rounded-2xl bg-yellow-400 py-4 text-lg font-bold text-black transition hover:bg-yellow-300"
          >
            Войти
          </Link>

          

        </div>

      </div>

    </div>
  );
}

export default WelcomePage;