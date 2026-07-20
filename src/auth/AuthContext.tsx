import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";



type User = {
  login: string;
  status: string;
  bonuses: number;
  orders: number;
  role: "user" | "admin";
};

type StoredUser = {
  login: string;
  password: string;
  status: string;
  bonuses: number;
  orders: number;
  role: "user" | "admin";
};

type Result = {
  success: boolean;
  message: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;

  register: (login: string, password: string) => Result;

  login: (login: string, password: string) => Result;

  logout: () => void;

  updateProfile: (
    login: string,
    password: string
  ) => Result;
};

const AuthContext = createContext<AuthContextType | null>(null);



export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");

    const users: StoredUser[] = JSON.parse(
      localStorage.getItem("users") ?? "[]"
    );

    const adminExists = users.some(
      (u) => u.role === "admin"
    );

    if (!adminExists) {
      users.push({
       login: "admin",
        password: "Dos39096312",
        status: "Administrator",
        bonuses: 0,
        orders: 0,
        role: "admin",
      });

  localStorage.setItem(
    "users",
    JSON.stringify(users)
  );
}

    if (currentUser) {
      setUser(JSON.parse(currentUser));
    }
  }, []);

  function register(login: string, password: string): Result {
    if (!login.trim()) {
      return {
        success: false,
        message: "Введите логин",
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        message:
          "Пароль должен содержать минимум 6 символов",
      };
    }

    const users: StoredUser[] = JSON.parse(
      localStorage.getItem("users") ?? "[]"
    );

    const exists = users.some(
      (u) =>
        u.login.toLowerCase() ===
        login.toLowerCase()
    );

    if (exists) {
      return {
        success: false,
        message: "Такой логин уже существует",
      };
    }

    const newUser: StoredUser = {
      login,
      password,
      status: "MAX GOLD",
      bonuses: 84500,
      orders: 0,
      role: "user",
    };

    users.push(newUser);

    localStorage.setItem(
      "users",
      JSON.stringify(users)
    );


  const currentUser: User = {
    login,
    status: newUser.status,
    bonuses: newUser.bonuses,
    orders: newUser.orders,
    role: newUser.role,
  };

    localStorage.setItem(
      "currentUser",
      JSON.stringify(currentUser)
    );

    setUser(currentUser);

    return {
      success: true,
      message: "Регистрация выполнена",
    };
  }

  function login(
    login: string,
    password: string
  ): Result {const users: StoredUser[] = JSON.parse(
      localStorage.getItem("users") ?? "[]"
    );

    const found = users.find(
      (u) =>
        u.login === login &&
        u.password === password
    );

    if (!found) {
      return {
        success: false,
        message: "Неверный логин или пароль",
      };
    }


  const currentUser: User = {
    login: found.login,
    status: found.status,
    bonuses: found.bonuses,
    orders: found.orders,
    role: found.role,
  };

    localStorage.setItem(
      "currentUser",
      JSON.stringify(currentUser)
    );

    setUser(currentUser);

    return {
      success: true,
      message: "Успешный вход",
    };
  }

  function updateProfile(
    login: string,
    password: string
  ): Result {
    if (!user) {
      return {
        success: false,
        message: "Пользователь не найден",
      };
    }

    const users: StoredUser[] = JSON.parse(
      localStorage.getItem("users") ?? "[]"
    );

    const index = users.findIndex(
      (u) => u.login === user.login
    );

    if (index === -1) {
      return {
        success: false,
        message: "Пользователь не найден",
      };
    }

    users[index] = {
      ...users[index],
      login,
      password:
        password.trim() === ""
          ? users[index].password
          : password,
    };

    localStorage.setItem(
      "users",
      JSON.stringify(users)
    );

    const updatedUser: User = {
      login,
      status: users[index].status,
      bonuses: users[index].bonuses,
      orders: users[index].orders,
      role: users[index].role,
    };

    localStorage.setItem(
      "currentUser",
      JSON.stringify(updatedUser)
    );

    setUser(updatedUser);

    return {
      success: true,
      message: "Профиль успешно обновлён",
    };
  }

  function logout() {
    localStorage.removeItem("currentUser");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      register,
      login,
      logout,
      updateProfile,
    }),
    [user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth должен использоваться внутри AuthProvider"
    );
  }

  return context;
}