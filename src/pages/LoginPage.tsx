import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";


function LoginPage() {

const navigate = useNavigate();

const { login } = useAuth();


const [name,setName] = useState("");

const [phone,setPhone] = useState("");

const [error,setError] = useState("");



async function handleLogin(){


setError("");



const result = await login(
name,
phone
);



if(!result.success){

setError(
result.message
);

return;

}



navigate("/");


}



return (

<div className="min-h-screen flex items-center justify-center bg-black">


<div className="w-full max-w-md rounded-3xl bg-zinc-900 p-8">


<h1 className="text-center text-4xl font-black text-white">

Добро пожаловать

</h1>


<p className="mt-2 text-center text-zinc-400">

Вход в KUSAI MAX

</p>



<div className="mt-8 space-y-5">


<div className="relative">

<User
className="absolute left-4 top-4 text-zinc-500"
size={20}
/>


<Input

className="pl-12"

placeholder="Ваше имя"

value={name}

onChange={(e)=>
setName(e.target.value)
}

/>

</div>



<div className="relative">


<Phone

className="absolute left-4 top-4 text-zinc-500"

size={20}

/>


<Input

className="pl-12"

placeholder="+79991234567"

value={phone}

onChange={(e)=>
setPhone(e.target.value)
}

/>


</div>



{
error && (

<div className="rounded-xl border border-red-500 bg-red-500/10 p-3 text-sm text-red-400">

{error}

</div>

)

}



<Button onClick={handleLogin}>

Войти

</Button>


</div>


</div>


</div>

);


}


export default LoginPage;