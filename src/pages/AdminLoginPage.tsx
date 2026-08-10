import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";


function AdminLoginPage() {

  const navigate = useNavigate();


  const [login,setLogin] =
    useState("");

  const [password,setPassword] =
    useState("");

  const [error,setError] =
    useState("");



  async function handleLogin(){

    setError("");


    try {


      const response =
        await fetch(
          "http://localhost:3001/api/admin/login",
          {

            method:"POST",

            headers:{
              "Content-Type":
              "application/json",
            },

            body:JSON.stringify({

              login,
              password,

            }),

          }
        );



      const data =
        await response.json();



      if(!data.success){

        setError(
          data.message
        );

        return;

      }



      const adminUser = {

        id:
          data.admin.id,

        name:
          data.admin.name,

        login:
          data.admin.login,

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



      navigate("/admin");



    } catch(error){


      console.error(error);


      setError(
        "Ошибка соединения с сервером"
      );


    }


  }



return (

<div

className="
min-h-screen
bg-black
flex
items-center
justify-center
px-4
"

>


<div

className="
w-full
max-w-md
text-white
"

>


<div

className="
flex
justify-center
mb-8
"

>

<div

className="
w-20
h-20
rounded-full
bg-white
text-black
flex
items-center
justify-center
shadow-2xl
"

>

<Shield size={38}/>

</div>


</div>



<h1

className="
text-4xl
font-bold
text-center
tracking-widest
"

>

KUSAI MAX

</h1>



<p

className="
text-center
text-gray-400
mt-3
mb-10
tracking-wide
"

>

ADMIN PANEL

</p>




<div

className="
space-y-5
"

>


<Input

placeholder="Логин"

value={login}

onChange={(e)=>
setLogin(
e.target.value
)
}

/>



<Input

type="password"

placeholder="Пароль"

value={password}

onChange={(e)=>
setPassword(
e.target.value
)
}

/>



{
error &&

<div

className="
text-red-400
text-center
text-sm
"

>

{error}

</div>

}



<Button

onClick={handleLogin}

>

Войти


</Button>


</div>



<p

className="
text-center
text-xs
text-gray-600
mt-10
"

>

KUSAI MAX SECURITY SYSTEM

</p>



</div>


</div>

);

}


export default AdminLoginPage;