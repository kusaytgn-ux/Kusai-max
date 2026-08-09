export function calculateBonusDiscount({
  price,
  category,
  clientPoints,
}) {

  let percent = 0;


  // Ограничения бонусов

  if (category === "accessory") {
    percent = 30;
  }


  if (category === "tech") {
    percent = 3;
  }


  // Максимально возможное списание
  const maxBonusByProduct = Math.floor(
    price * percent / 100
  );


  // Учитываем бонусы клиента
  const bonusUsed = Math.min(
    maxBonusByProduct,
    clientPoints
  );


  // Цена после бонусов

  const priceAfterBonus =
    price - bonusUsed;


  // Округление до привлекательной цены

  const finalPrice = roundPrice(
    priceAfterBonus
  );


  return {

    price,

    category,

    maxBonusUse: maxBonusByProduct,

    bonusUsed,

    priceAfterBonus,

    finalPrice,

  };

}



// Округление вверх до xx490 или xx990

function roundPrice(price) {


  const endings = [490, 990];


  const thousands =
    Math.floor(price / 1000) * 1000;


  for (const ending of endings) {

    const candidate =
      thousands + ending;


    if (candidate >= price) {
      return candidate;
    }

  }


  return thousands + 1490;

}