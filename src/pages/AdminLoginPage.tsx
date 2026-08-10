import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";


function AdminLoginPage() {

const navigate = useNavigate();

const { adminLogin } = useAuth();


const [login,setLogin] = useState("");

const [password,setPassword] = useState("");

const [error,setError] = useState("");



async function handleLogin(){

setError("");


const result =
await adminLogin(
login,
password
);



if(!result.success){

setError(
result.message
);

return;

}


navigate("/admin");


}



return (

<div className="min-h-screen flex items-center justify-center bg-black">


<div className="w-full max-w-md rounded-3xl bg-zinc-900 p-8">


<div className="flex justify-center">

<Shield
size={50}
className="text-yellow-400"
/>

</div>



<h1 className="mt-5 text-center text-3xl font-black text-white">

KUSAI MAX ADMIN

</h1>


<p className="mt-2 text-center text-zinc-400">

Вход администратора

</p>



<div className="mt-8 space-y-5">


<Input

placeholder="Логин"

value={login}

onChange={(e)=>
setLogin(e.target.value)
}

/>



<Input

type="password"

placeholder="Пароль"

value={password}

onChange={(e)=>
setPassword(e.target.value)
}

/>



{
error && (

<div className="rounded-xl border border-red-500 bg-red-500/10 p-3 text-red-400">

{error}

</div>

)

}



<Button
onClick={handleLogin}
>

Войти

</Button>



</div>


</div>


</div>


);

}


export default AdminLoginPage;