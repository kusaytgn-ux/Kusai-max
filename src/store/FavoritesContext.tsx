import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FavoritesContextType = {
  favorites: number[];
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number) => void;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [favorites, setFavorites] = useState<number[]>([]);

  function toggleFavorite(id: number) {
    setFavorites((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  }

  function isFavorite(id: number) {
    return favorites.includes(id);
  }

  const value = useMemo(
    () => ({
      favorites,
      toggleFavorite,
      isFavorite,
    }),
    [favorites]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error(
      "useFavorites должен использоваться внутри FavoritesProvider"
    );
  }

  return context;
}