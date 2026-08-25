import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../auth/AuthContext";

type FavoritesContextType = {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const FavoritesContext =
  createContext<FavoritesContextType | null>(null);

function getStorageKey(userId?: string | number | null) {
  if (!userId) {
    return "kusai_favorites_guest";
  }

  return `kusai_favorites_${userId}`;
}

function loadFavorites(
  userId?: string | number | null
): string[] {
  try {
    const key = getStorageKey(userId);
    const saved = localStorage.getItem(key);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(String);
  } catch (error) {
    console.error(
      "Ошибка загрузки избранного:",
      error
    );

    return [];
  }
}

export function FavoritesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  /*
   * ВАЖНО:
   * Здесь используем id пользователя.
   *
   * Если в твоём user поле называется не id,
   * а например phone — ниже поменяем на нужное поле.
   */
  const userId =
    user?.id ?? null;

  const [favorites, setFavorites] =
    useState<string[]>(() =>
      loadFavorites(userId)
    );

  /*
   * Когда пользователь меняется —
   * загружаем его собственное избранное.
   */
  useEffect(() => {
    setFavorites(loadFavorites(userId));
  }, [userId]);

  /*
   * Сохраняем избранное после каждого изменения.
   */
  useEffect(() => {
    try {
      const key = getStorageKey(userId);

      localStorage.setItem(
        key,
        JSON.stringify(favorites)
      );
    } catch (error) {
      console.error(
        "Ошибка сохранения избранного:",
        error
      );
    }
  }, [favorites, userId]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      if (prev.includes(id)) {
        return prev.filter(
          (item) => item !== id
        );
      }

      return [...prev, id];
    });
  }

  function isFavorite(id: string) {
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
  const context =
    useContext(FavoritesContext);

  if (!context) {
    throw new Error(
      "useFavorites должен использоваться внутри FavoritesProvider"
    );
  }

  return context;
}