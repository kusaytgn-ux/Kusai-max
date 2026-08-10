import bcrypt from "bcrypt";
import { db } from "./firebaseAdmin.js";


async function createAdmin(){

  const login = "admin";

  const password = "Dos39096312";


  const passwordHash =
    await bcrypt.hash(password, 10);



  await db
    .collection("admins")
    .doc("admin")
    .set({

      name: "Administrator",

      login,

      passwordHash,

      role: "admin",

      createdAt: new Date()

    });



  console.log(
    "Администратор создан"
  );


  process.exit();

}


createAdmin();