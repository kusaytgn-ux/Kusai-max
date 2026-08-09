import { create } from "zustand";
import type { Client } from "../types/client";


interface ClientStore {

  client:Client | null;

  setClient:(client:Client)=>void;

  logout:()=>void;

}


export const useClientStore =
create<ClientStore>((set)=>({

  client:
    JSON.parse(
      localStorage.getItem("client") || "null"
    ),


  setClient:(client)=>{

    localStorage.setItem(
      "authVersion",
      "2"
    );

    localStorage.setItem(
      "currentUser",
      JSON.stringify(client)
    );


    set({
      client
    });

  },


  logout:()=>{

    localStorage.removeItem("client");

    set({
      client:null
    });

  }

}));