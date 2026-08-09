import type { ChangeEvent } from "react";
import { Search } from "lucide-react";

type Props = {
  placeholder?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function SearchInput({
  placeholder,
  value,
  onChange,
}: Props) {
  return (
    <div className="relative">

      <Search
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
      />

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-4 pl-12 pr-5 text-white outline-none transition focus:border-yellow-400"
      />

    </div>
  );
}

export default SearchInput;