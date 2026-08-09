import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";


export type ChatMessage = {
  id: string;
  userLogin: string;
  author: "user" | "admin";
  text: string;
  createdAt?: any;
};


type ConciergeContextType = {
  messages: ChatMessage[];

  sendUserMessage: (
    userLogin: string,
    text: string
  ) => Promise<void>;

  sendAdminMessage: (
    userLogin: string,
    text: string
  ) => Promise<void>;
};


const ConciergeContext =
  createContext<ConciergeContextType | null>(null);



export function ConciergeProvider({
  children,
}: {
  children: ReactNode;
}) {


  const [messages, setMessages] =
    useState<ChatMessage[]>([]);



  useEffect(() => {


    const unsubscribe = onSnapshot(
      collection(db, "messages"),
      (snapshot) => {


        const list: ChatMessage[] =
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ChatMessage, "id">),
          }));


        // сортировка на клиенте
        list.sort((a, b) => {

          const timeA =
            a.createdAt?.seconds ?? 0;

          const timeB =
            b.createdAt?.seconds ?? 0;


          return timeA - timeB;

        });


        setMessages(list);

      }
    );


    return unsubscribe;


  }, []);



  async function sendUserMessage(
    userLogin: string,
    text: string
  ) {

    await addDoc(
      collection(db, "messages"),
      {
        userLogin,
        author: "user",
        text,
        createdAt: serverTimestamp(),
      }
    );

  }




  async function sendAdminMessage(
    userLogin: string,
    text: string
  ) {

    await addDoc(
      collection(db, "messages"),
      {
        userLogin,
        author: "admin",
        text,
        createdAt: serverTimestamp(),
      }
    );

  }



  return (

    <ConciergeContext.Provider
      value={{
        messages,
        sendUserMessage,
        sendAdminMessage,
      }}
    >

      {children}

    </ConciergeContext.Provider>

  );

}




export function useConcierge() {


  const context =
    useContext(ConciergeContext);


  if (!context) {

    throw new Error(
      "useConcierge должен использоваться внутри ConciergeProvider"
    );

  }


  return context;

}