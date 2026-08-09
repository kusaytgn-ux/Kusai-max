type Props = {
  login: string;
  selected: boolean;
  onClick: () => void;
};

function ChatUserCard({
  login,
  selected,
  onClick,
}: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl p-4 text-left transition ${
        selected
          ? "bg-yellow-400 text-black"
          : "bg-zinc-900 text-white hover:bg-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between">

        <div>
          <h3 className="font-bold">
            {login}
          </h3>

          <p className="mt-1 text-sm opacity-70">
            Открыть переписку
          </p>
        </div>

      </div>
    </button>
  );
}

export default ChatUserCard;