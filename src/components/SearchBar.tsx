function SearchBar() {
  return (
    <div className="mt-5">
      <input
        type="text"
        placeholder="Поиск товаров..."
        className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-5 py-4 text-white placeholder:text-zinc-500 outline-none focus:border-yellow-500"
      />
    </div>
  );
}

export default SearchBar;