import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";


type User = {
  id: string;

  name: string;

  login?: string;

  phone: string;

  points: number;

  bonuses?: number;

  status?: string;

  orders?: number;

  role: "user" | "admin";
};


type Result = {
  success: boolean;
  message: string;
};


type AuthContextType = {

  user: User | null;

  isAuthenticated: boolean;


  login: (
    name: string,
    phone: string
  ) => Promise<Result>;


  adminLogin: (
    login: string,
    password: string
  ) => Promise<Result>;


  logout: () => void;


  register: (
    name: string,
    phone: string,
    password: string
  ) => Promise<Result>;


  updateProfile: (
    data: Partial<User>
  ) => Promise<Result>;

};


const AuthContext =
  createContext<AuthContextType | null>(null);



export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {


  const [user, setUser] =
    useState<User | null>(null);



  useEffect(() => {

    const saved =
      localStorage.getItem("currentUser");


    if (saved) {

      setUser(
        JSON.parse(saved)
      );

    }

  }, []);




  // =========================
  // Вход клиента
  // =========================

  async function login(
    name: string,
    phone: string
  ): Promise<Result> {


    try {
// тут нужна постоянная ссылкв 

      const response =
        await fetch(
          "https://kusai-max-api.vercel.app/api/auth",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              name,
              phone,
            }),
          }
        );



      const data =
        await response.json();



      if (!data.success) {

        return {
          success: false,
          message:
            data.message ??
            "Пользователь не найден",
        };

      }



      const client: User = {


        id:
          data.client.id,


        name:
          data.client.name,


        login:
          data.client.login ??
          data.client.name,


        phone:
          data.client.phone,


        points:
          data.client.points ?? 0,


        bonuses:
          data.client.points ?? 0,


        status:
          data.client.status ??
          "MAX START",


        orders:
          data.client.orders ?? 0,


        role:
          "user",

      };




      localStorage.setItem(
        "currentUser",
        JSON.stringify(client)
      );


      setUser(client);



      return {

        success: true,

        message:
          "Успешный вход",

      };



    } catch {


      return {

        success: false,

        message:
          "Ошибка соединения с сервером",

      };


    }

  }





  // =========================
  // Вход администратора
  // =========================

  async function adminLogin(
    login: string,
    password: string
  ): Promise<Result> {


    const adminLogin =
      import.meta.env.VITE_ADMIN_LOGIN;


    const adminPassword =
      import.meta.env.VITE_ADMIN_PASSWORD;



    if (
      login !== adminLogin ||
      password !== adminPassword
    ) {


      return {

        success: false,

        message:
          "Неверный логин или пароль",

      };


    }



    const adminUser: User = {


      id:
        "admin",


      name:
        "Administrator",


      login,


      phone:
        "",


      points:
        0,


      bonuses:
        0,


      status:
        "ADMIN",


      orders:
        0,


      role:
        "admin",

    };




    localStorage.setItem(
      "currentUser",
      JSON.stringify(adminUser)
    );


    setUser(adminUser);



    return {

      success: true,

      message:
        "Вход администратора выполнен",

    };


  }







  // =========================
  // Регистрация
  // =========================

  async function register(
    name: string,
    phone: string,
    password: string
  ): Promise<Result> {


    console.log(
      "register",
      name,
      phone,
      password
    );


    return {

      success: true,

      message:
        "Регистрация выполнена",

    };

  }






  // =========================
  // Обновление профиля
  // =========================

  async function updateProfile(
    data: Partial<User>
  ): Promise<Result> {


    if (!user) {


      return {

        success: false,

        message:
          "Пользователь не найден",

      };

    }



    const updatedUser: User = {

      ...user,

      ...data,

    };



    localStorage.setItem(
      "currentUser",
      JSON.stringify(updatedUser)
    );


    setUser(updatedUser);



    return {

      success: true,

      message:
        "Профиль обновлен",

    };

  }





  function logout() {


    localStorage.removeItem(
      "currentUser"
    );


    setUser(null);

  }







  const value =
    useMemo(
      () => ({

        user,


        isAuthenticated:
          !!user,


        login,


        adminLogin,


        logout,


        register,


        updateProfile,


      }),

      [
        user,
      ]

    );





  return (

    <AuthContext.Provider
      value={value}
    >

      {children}

    </AuthContext.Provider>

  );


}







export function useAuth() {


  const context =
    useContext(AuthContext);



  if (!context) {

    throw new Error(
      "useAuth должен использоваться внутри AuthProvider"
    );

  }



  return context;

}