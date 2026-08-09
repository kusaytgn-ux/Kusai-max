const API_URL = "http://localhost:3001";


export async function authClient(
  name: string,
  phone: string
) {

  const response = await fetch(
    `${API_URL}/api/auth`,
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


  const data = await response.json();


  if (!data.success) {

    throw new Error(
      data.message || "Ошибка авторизации"
    );

  }


  return data;

}