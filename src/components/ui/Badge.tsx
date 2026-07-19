type BadgeProps = {
  text: string;
};

function Badge({ text }: BadgeProps) {
  return (
    <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
      {text}
    </span>
  );
}

export default Badge;