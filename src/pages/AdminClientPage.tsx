import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
doc,
getDoc,
collection,
getDocs,
orderBy,
query,
} from "firebase/firestore";

import { db } from "../firebase/firebase";


function AdminClientPage(){


const { id } =
useParams();



const [client,setClient] =
useState<any>(null);


const [operations,setOperations] =
useState<any[]>([]);



useEffect(()=>{


async function load(){


if(!id) return;



const clientRef =
doc(
db,
"clients",
id
);



const clientSnap =
await getDoc(clientRef);



if(clientSnap.exists()){

setClient({

id:clientSnap.id,

...clientSnap.data(),

});

}



const operationsQuery =
query(

collection(
db,
"clients",
id,
"operations"
),

orderBy(
"date",
"desc"
)

);



const operationsSnap =
await getDocs(
operationsQuery
);



setOperations(

operationsSnap.docs.map(doc=>({

id:doc.id,

...doc.data()

}))

);



}



load();



},[id]);





if(!client){

return (

<div className="p-8 text-white">

Загрузка клиента...

</div>

)

}





return (

<div

className="
min-h-screen
bg-black
text-white
p-8
"

>


<h1

className="
text-4xl
font-black
text-yellow-400
"

>

{client.name}

</h1>


<p className="mt-3 text-zinc-400">

📱 {client.phone}

</p>



<div

className="
mt-8
grid
md:grid-cols-3
gap-5
"

>


<div className="rounded-3xl bg-zinc-900 p-6">

<p className="text-zinc-400">

Бонусы

</p>

<h2 className="text-4xl font-bold text-yellow-400">

{client.points ?? 0}

</h2>

</div>



<div className="rounded-3xl bg-zinc-900 p-6">

<p className="text-zinc-400">

Статус

</p>

<h2 className="text-2xl font-bold">

{client.status ?? "NEW CLIENT"}

</h2>

</div>



<div className="rounded-3xl bg-zinc-900 p-6">

<p className="text-zinc-400">

Заказы

</p>

<h2 className="text-4xl font-bold">

{client.orders ?? 0}

</h2>

</div>


</div>




<div className="mt-8 rounded-3xl bg-zinc-900 p-8">


<h2 className="text-2xl font-bold">

История бонусов

</h2>



<div className="mt-5 space-y-3">


{
operations.length === 0 && (

<p className="text-zinc-400">

Операций пока нет

</p>

)
}



{
operations.map(item=>(


<div

key={item.id}

className="
border-b
border-zinc-800
pb-3
"

>


<p>

{item.type === "add"
?
"➕ Начисление"
:
"➖ Списание"
}

</p>


<p className="text-yellow-400">

{item.points} бонусов

</p>


<p className="text-zinc-500">

{item.reason}

</p>


</div>


))

}



</div>


</div>



</div>

)

}


export default AdminClientPage;