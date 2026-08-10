import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";


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


const [user,setUser] =
useState<User | null>(null);



useEffect(()=>{


const saved =
localStorage.getItem(
  "currentUser"
);


if(saved){

setUser(
  JSON.parse(saved)
);

}


},[]);





// =========================
// Пользовательский вход
// =========================


async function login(
name:string,
phone:string
):Promise<Result>{


try{


const q =
query(
collection(db,"clients"),
where(
"phone",
"==",
phone
)
);



const snapshot =
await getDocs(q);



let client:any;



// Клиент уже существует

if(!snapshot.empty){


const clientDoc =
snapshot.docs[0];


client = {

id:clientDoc.id,

...clientDoc.data(),

};



}


// Новый клиент

else{


const newClient = {
  name,
  phone,
  login:name,

  // приветственные бонусы
  points:100000,
  bonuses:100000,
  orders:0,

  status:"NEW CLIENT",
  role:"user",

  createdAt:
    serverTimestamp(),
  source:"telegram",
  welcomeBonus:true,
};



const docRef =
await addDoc(
collection(db,"clients"),
newClient
);



client = {


id:docRef.id,

...newClient,


};


}





const currentUser:User = {


id:
client.id,


name:
client.name,


login:
client.login ??
client.name,


phone:
client.phone,


points:
client.points ?? 0,


bonuses:
client.bonuses ?? 0,


status:
client.status ??
"MAX START",


orders:
client.orders ?? 0,


role:
"user",


};




localStorage.setItem(
"currentUser",
JSON.stringify(currentUser)
);



setUser(currentUser);



return {


success:true,

message:
"Успешный вход",


};



}catch(error){


console.error(
"Firebase login error",
error
);



return {


success:false,

message:
"Ошибка Firebase",


};



}


}





// =========================
// Вход администратора
// =========================


async function adminLogin(
login:string,
password:string
):Promise<Result>{



const adminLogin =
import.meta.env.VITE_ADMIN_LOGIN;



const adminPassword =
import.meta.env.VITE_ADMIN_PASSWORD;




if(
login !== adminLogin ||
password !== adminPassword
){


return{


success:false,

message:
"Неверный логин или пароль",


};


}





const adminUser:User = {


id:"admin",


name:
"Administrator",


login,


phone:"",


points:0,


bonuses:0,


status:"ADMIN",


orders:0,


role:"admin",


};



localStorage.setItem(
"currentUser",
JSON.stringify(adminUser)
);



setUser(adminUser);



return{


success:true,

message:
"Вход выполнен",


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
    "Старая регистрация отключена:",
    name,
    phone,
    password
  );


  return {

    success: false,

    message:
      "Регистрация по логину и паролю отключена. Используйте вход по имени и телефону.",

  };


}




// =========================
// Обновление профиля
// =========================


async function updateProfile(
data:Partial<User>
):Promise<Result>{



if(!user){


return {


success:false,

message:
"Пользователь не найден",


};


}





const updatedUser = {


...user,

...data,


};





localStorage.setItem(
"currentUser",
JSON.stringify(updatedUser)
);



setUser(updatedUser);





if(user.id !== "admin"){


await updateDoc(
doc(
db,
"clients",
user.id
),

data

);


}





return {


success:true,

message:
"Профиль обновлен",


};



}





// =========================
// Выход
// =========================


function logout(){


localStorage.removeItem(
"currentUser"
);


setUser(null);


}





const value =
useMemo(()=>({


user,


isAuthenticated:
!!user,


login,


adminLogin,


logout,


register,


updateProfile,


}),[user]);





return(

<AuthContext.Provider
value={value}
>

{children}

</AuthContext.Provider>

);


}





export function useAuth(){


const context =
useContext(AuthContext);



if(!context){

throw new Error(
"useAuth должен использоваться внутри AuthProvider"
);


}



return context;


}