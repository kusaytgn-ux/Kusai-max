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

  logout: () => void;

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





async function login(
name:string,
phone:string
):Promise<Result>{


try{


const response =
await fetch(
"http://localhost:3001/api/auth",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

name,

phone

})

}
);



const data =
await response.json();



if(!data.success){

return {

success:false,

message:data.message

};

}



const client:User = {


id:data.client.id,


name:data.client.name,


phone:data.client.phone,


points:data.client.points ?? 0,


bonuses:data.client.points ?? 0,


status:"MAX START",


orders:0,


role:"user"


};



localStorage.setItem(

"currentUser",

JSON.stringify(client)

);



setUser(client);



return {

success:true,

message:"Успешный вход"

};



}
catch(error){


console.error(error);



return {

success:false,

message:"Ошибка соединения с сервером"

};


}


}





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


logout


}),[user]);





return (

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