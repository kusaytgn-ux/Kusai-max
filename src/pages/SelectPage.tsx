import Header from "../components/layout/Header";


function SelectPage() {
  // Заглушка Select
    return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto flex max-w-md flex-col items-center px-5 py-5">
        <div className="flex min-h-[70vh] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 text-4xl">
            🛍️
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            Select скоро будет готов
          </h1>

          <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
            Мы уже готовим спецпредложения и фотографии.
            <br />
            Совсем скоро здесь появится персональный Select KUSAY MAX.
          </p>
        </div>
      </main>

      
    </div>
  );

}

export default SelectPage;