export async function sendClientTo1C(data: {
  name: string;
  phone: string;
  bonus: number;
}) {
  const response = await fetch(
    "https://АДРЕС_1С/api/client",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Ошибка отправки в 1С");
  }

  return response.json();
}