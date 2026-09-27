function Iphone18Banner() {
  return (
    <section className="w-full">
      <div
        className="
          w-full
          overflow-hidden
          rounded-[45px]
          border-yellow-400/20
          bg-black
          shadow-2xl
        "
      >
        <img
          src="/iphone18pro-banner.webp"
          alt="iPhone 18 Pro от 1490 рублей по программе Trade-In"
          width="1200"
          height="600"
          loading="eager"
          decoding="async"
          className="
            block
            aspect-[2/1]
            h-auto
            w-full
            object-cover
          "
        />
      </div>
    </section>
  );
}

export default Iphone18Banner;