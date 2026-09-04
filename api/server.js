import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import "dotenv/config";

import { query } from "./postgres.js";

import {
  getProducts,
  getProductById,
  testMoySklad,
} from "./moysklad.js";

import {
  getOneCCustomer,
} from "./oneC.js";

import {
  calculateBonusDiscount,
} from "./bonus.js";


const app = express();

const PORT = process.env.PORT || 3001;

const ONE_C_API_KEY =
  process.env.ONE_C_API_KEY ||
  "KUSAI-MAX-1C-KEY-2026";


app.use(cors());

app.use(express.json({
  limit: "20mb",
}));


/*
|--------------------------------------------------------------------------
| ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
|--------------------------------------------------------------------------
*/

function normalizePhone(phone) {
  let value = String(phone || "")
    .replace(/\D/g, "");

  if (!value) {
    return "";
  }

  if (
    value.startsWith("8") &&
    value.length === 11
  ) {
    value =
      "7" + value.slice(1);
  }

  if (
    value.startsWith("9") &&
    value.length === 10
  ) {
    value =
      "7" + value;
  }

  if (
    !value.startsWith("7") ||
    value.length !== 11
  ) {
    return "";
  }

  return value;
}


function validatePhone(phone) {
  return /^7\d{10}$/.test(
    String(phone || "")
  );
}


function check1CAccess(req, res) {
  const apiKey =
    req.headers["x-api-key"];

  if (
    apiKey !== ONE_C_API_KEY
  ) {
    res.status(403).json({
      success: false,
      message: "Нет доступа",
    });

    return false;
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| СОЗДАНИЕ ТАБЛИЦ
|--------------------------------------------------------------------------
*/

async function initializeDatabase() {

  /*
  |--------------------------------------------------------------------------
  | ТОВАРЫ
  |--------------------------------------------------------------------------
  */

  await query(`
    CREATE TABLE IF NOT EXISTS products (

      id TEXT PRIMARY KEY,

      title TEXT NOT NULL DEFAULT '',

      article TEXT,

      price NUMERIC DEFAULT 0,

      group_id INTEGER,

      subgroup_id INTEGER,

      description TEXT DEFAULT '',

      memory TEXT DEFAULT '',

      color TEXT DEFAULT '',

      warranty TEXT DEFAULT '',

      images JSONB DEFAULT '[]'::jsonb,

      badge TEXT DEFAULT '',

      hidden BOOLEAN DEFAULT FALSE,

      created_at TIMESTAMP DEFAULT NOW(),

      updated_at TIMESTAMP DEFAULT NOW()

    )
  `);


  /*
  |--------------------------------------------------------------------------
  | ГРУППЫ
  |--------------------------------------------------------------------------
  */

  await query(`
    CREATE TABLE IF NOT EXISTS product_groups (

      id SERIAL PRIMARY KEY,

      name TEXT NOT NULL UNIQUE,

      created_at TIMESTAMP DEFAULT NOW()

    )
  `);


  /*
  |--------------------------------------------------------------------------
  | ПОДГРУППЫ
  |--------------------------------------------------------------------------
  */

  await query(`
    CREATE TABLE IF NOT EXISTS product_subgroups (

      id SERIAL PRIMARY KEY,

      group_id INTEGER NOT NULL,

      name TEXT NOT NULL,

      created_at TIMESTAMP DEFAULT NOW(),

      UNIQUE(group_id, name),

      CONSTRAINT fk_product_group
        FOREIGN KEY(group_id)
        REFERENCES product_groups(id)
        ON DELETE CASCADE

    )
  `);


  /*
  |--------------------------------------------------------------------------
  | КЛИЕНТЫ
  |--------------------------------------------------------------------------
  */

  await query(`
    CREATE TABLE IF NOT EXISTS clients (

      id SERIAL PRIMARY KEY,

      name TEXT NOT NULL,

      phone TEXT NOT NULL UNIQUE,

      points NUMERIC DEFAULT 0,

      status TEXT DEFAULT 'MAX GOLD',

      created_at TIMESTAMP DEFAULT NOW()

    )
  `);


  /*
  |--------------------------------------------------------------------------
  | ОПЕРАЦИИ БОНУСОВ
  |--------------------------------------------------------------------------
  */

  await query(`
    CREATE TABLE IF NOT EXISTS client_operations (

      id SERIAL PRIMARY KEY,

      client_id INTEGER NOT NULL,

      type TEXT NOT NULL,

      points NUMERIC DEFAULT 0,

      reason TEXT,

      created_at TIMESTAMP DEFAULT NOW(),

      CONSTRAINT fk_client
        FOREIGN KEY(client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE

    )
  `);


  /*
  |--------------------------------------------------------------------------
  | АДМИНИСТРАТОРЫ
  |--------------------------------------------------------------------------
  */

  await query(`
    CREATE TABLE IF NOT EXISTS admins (

      id SERIAL PRIMARY KEY,

      name TEXT DEFAULT '',

      login TEXT NOT NULL UNIQUE,

      password_hash TEXT NOT NULL,

      created_at TIMESTAMP DEFAULT NOW()

    )
  `);


  console.log(
    "✅ PostgreSQL таблицы готовы"
  );
}


/*
|--------------------------------------------------------------------------
| ГЛАВНАЯ
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {

  res.json({
    success: true,
    message:
      "KUSAI MAX API работает",
  });

});


app.get("/api", (req, res) => {

  res.json({
    success: true,
    message:
      "KUSAI MAX API работает",
  });

});


/*
|--------------------------------------------------------------------------
| ГРУППЫ ТОВАРОВ
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Получить все группы
|--------------------------------------------------------------------------
*/

app.get(
  "/api/product-groups",
  async (req, res) => {

    try {

      const result =
        await query(`
          SELECT *
          FROM product_groups
          ORDER BY name ASC
        `);

      res.json({
        success: true,
        groups: result.rows,
      });

    } catch (error) {

      console.error(
        "Ошибка получения групп:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения групп",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| Создать группу
|--------------------------------------------------------------------------
*/

app.post(
  "/api/product-groups",
  async (req, res) => {

    try {

      const name =
        String(
          req.body.name || ""
        ).trim();

      if (!name) {

        return res.status(400).json({
          success: false,
          message:
            "Введите название группы",
        });

      }

      const result =
        await query(
          `
            INSERT INTO product_groups (name)

            VALUES ($1)

            RETURNING *
          `,
          [name]
        );

      res.status(201).json({
        success: true,
        group:
          result.rows[0],
      });

    } catch (error) {

      if (
        error.code === "23505"
      ) {

        return res.status(409).json({
          success: false,
          message:
            "Такая группа уже существует",
        });

      }

      console.error(
        "Ошибка создания группы:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка создания группы",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| Удалить группу
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/product-groups/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      /*
      |--------------------------------------------------------------------------
      | Сначала убираем группу у товаров
      |--------------------------------------------------------------------------
      */

      await query(
        `
          UPDATE products

          SET
            group_id = NULL,
            subgroup_id = NULL,
            updated_at = NOW()

          WHERE group_id = $1
        `,
        [id]
      );


      /*
      |--------------------------------------------------------------------------
      | Удаляем группу
      |--------------------------------------------------------------------------
      */

      const result =
        await query(
          `
            DELETE FROM product_groups

            WHERE id = $1

            RETURNING *
          `,
          [id]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Группа не найдена",
        });

      }

      res.json({
        success: true,
        message:
          "Группа удалена",
      });

    } catch (error) {

      console.error(
        "Ошибка удаления группы:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка удаления группы",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| ПОДГРУППЫ
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Получить подгруппы группы
|--------------------------------------------------------------------------
*/

app.get(
  "/api/product-groups/:id/subgroups",
  async (req, res) => {

    try {

      const groupId =
        Number(req.params.id);

      const result =
        await query(
          `
            SELECT *

            FROM product_subgroups

            WHERE group_id = $1

            ORDER BY name ASC
          `,
          [groupId]
        );

      res.json({
        success: true,
        subgroups:
          result.rows,
      });

    } catch (error) {

      console.error(
        "Ошибка получения подгрупп:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения подгрупп",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| Создать подгруппу
|--------------------------------------------------------------------------
*/

app.post(
  "/api/product-groups/:id/subgroups",
  async (req, res) => {

    try {

      const groupId =
        Number(req.params.id);

      const name =
        String(
          req.body.name || ""
        ).trim();

      if (!name) {

        return res.status(400).json({
          success: false,
          message:
            "Введите название подгруппы",
        });

      }

      const result =
        await query(
          `
            INSERT INTO product_subgroups
              (group_id, name)

            VALUES ($1, $2)

            RETURNING *
          `,
          [
            groupId,
            name,
          ]
        );

      res.status(201).json({
        success: true,
        subgroup:
          result.rows[0],
      });

    } catch (error) {

      console.error(
        "Ошибка создания подгруппы:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка создания подгруппы",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| Удалить подгруппу
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/product-subgroups/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      /*
      |--------------------------------------------------------------------------
      | Убираем подгруппу у товаров
      |--------------------------------------------------------------------------
      */

      await query(
        `
          UPDATE products

          SET
            subgroup_id = NULL,
            updated_at = NOW()

          WHERE subgroup_id = $1
        `,
        [id]
      );


      await query(
        `
          DELETE FROM product_subgroups

          WHERE id = $1
        `,
        [id]
      );

      res.json({
        success: true,
        message:
          "Подгруппа удалена",
      });

    } catch (error) {

      console.error(
        "Ошибка удаления подгруппы:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка удаления подгруппы",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| КЛИЕНТСКИЙ КАТАЛОГ
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| GET ТОВАРЫ

| limit
| offset
| groupId
| subgroupId
|--------------------------------------------------------------------------
*/

app.get(
  "/api/products",
  async (req, res) => {

    try {

      const limit =
        Math.min(
          Number(req.query.limit || 50),
          100
        );

      const offset =
        Math.max(
          Number(req.query.offset || 0),
          0
        );

      const groupId =
        req.query.groupId
          ? Number(req.query.groupId)
          : null;

      const subgroupId =
        req.query.subgroupId
          ? Number(req.query.subgroupId)
          : null;


      const params = [];

      let where =
        "WHERE p.hidden = FALSE";


      if (groupId) {

        params.push(groupId);

        where +=
          ` AND p.group_id = $${params.length}`;

      }


      if (subgroupId) {

        params.push(subgroupId);

        where +=
          ` AND p.subgroup_id = $${params.length}`;

      }


      params.push(limit);

      const limitIndex =
        params.length;


      params.push(offset);

      const offsetIndex =
        params.length;


      const result =
        await query(
          `
            SELECT

              p.*,

              g.name AS group_name,

              sg.name AS subgroup_name

            FROM products p

            LEFT JOIN product_groups g
              ON g.id = p.group_id

            LEFT JOIN product_subgroups sg
              ON sg.id = p.subgroup_id

            ${where}

            ORDER BY
              p.updated_at DESC

            LIMIT $${limitIndex}

            OFFSET $${offsetIndex}
          `,
          params
        );


      const countResult =
        await query(
          `
            SELECT
              COUNT(*) AS count

            FROM products p

            ${where}
          `,
          params.slice(
            0,
            params.length - 2
          )
        );


      const total =
        Number(
          countResult.rows[0].count
        );


      res.json({
        success: true,

        products:
          result.rows,

        total,

        hasMore:
          offset + result.rows.length <
          total,

      });

    } catch (error) {

      console.error(
        "Ошибка получения товаров:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения товаров",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| АДМИН: ВСЕ ТОВАРЫ
|--------------------------------------------------------------------------
*/

app.get(
  "/api/admin/products",
  async (req, res) => {

    try {

      const result =
        await query(`
          SELECT

            p.*,

            g.name AS group_name,

            sg.name AS subgroup_name

          FROM products p

          LEFT JOIN product_groups g
            ON g.id = p.group_id

          LEFT JOIN product_subgroups sg
            ON sg.id = p.subgroup_id

          ORDER BY
            p.updated_at DESC
        `);

      res.json({
        success: true,
        products:
          result.rows,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения товаров",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| ПОЛУЧИТЬ ОДИН ТОВАР
|--------------------------------------------------------------------------
*/

app.get(
  "/api/products/:id",
  async (req, res) => {

    try {

      const result =
        await query(
          `
            SELECT

              p.*,

              g.name AS group_name,

              sg.name AS subgroup_name

            FROM products p

            LEFT JOIN product_groups g
              ON g.id = p.group_id

            LEFT JOIN product_subgroups sg
              ON sg.id = p.subgroup_id

            WHERE p.id = $1

            LIMIT 1
          `,
          [req.params.id]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Товар не найден",
        });

      }

      res.json({
        success: true,
        product:
          result.rows[0],
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения товара",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| ОБНОВИТЬ ТОВАР АДМИНИСТРАТОРОМ
|--------------------------------------------------------------------------
*/

app.patch(
  "/api/products/:id",
  async (req, res) => {

    try {

      const id =
        req.params.id;


      const {

        group_id,

        subgroup_id,

        description,

        memory,

        color,

        warranty,

        images,

        badge,

        hidden,

      } = req.body;


      const result =
        await query(
          `
            UPDATE products

            SET

              group_id =
                $1,

              subgroup_id =
                $2,

              description =
                COALESCE($3, description),

              memory =
                COALESCE($4, memory),

              color =
                COALESCE($5, color),

              warranty =
                COALESCE($6, warranty),

              images =
                COALESCE($7::jsonb, images),

              badge =
                COALESCE($8, badge),

              hidden =
                COALESCE($9, hidden),

              updated_at =
                NOW()

            WHERE id = $10

            RETURNING *
          `,
          [

            group_id || null,

            subgroup_id || null,

            description,

            memory,

            color,

            warranty,

            images !== undefined
              ? JSON.stringify(images)
              : null,

            badge,

            hidden,

            id,

          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Товар не найден",
        });

      }


      res.json({
        success: true,

        product:
          result.rows[0],

      });

    } catch (error) {

      console.error(
        "Ошибка обновления товара:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка обновления товара",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| ПОИСК ТОВАРОВ
|--------------------------------------------------------------------------
*/

app.get(
  "/api/products/search/:term",
  async (req, res) => {

    try {

      const term =
        `%${req.params.term}%`;


      const result =
        await query(
          `
            SELECT

              p.*,

              g.name AS group_name,

              sg.name AS subgroup_name

            FROM products p

            LEFT JOIN product_groups g
              ON g.id = p.group_id

            LEFT JOIN product_subgroups sg
              ON sg.id = p.subgroup_id

            WHERE

              p.hidden = FALSE

              AND (

                p.title ILIKE $1

                OR p.article ILIKE $1

                OR p.description ILIKE $1

              )

            ORDER BY
              p.updated_at DESC

            LIMIT 100
          `,
          [term]
        );


      res.json({
        success: true,
        products:
          result.rows,
      });

    } catch (error) {

      console.error(
        "Ошибка поиска:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка поиска",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| МОЙСКЛАД TEST
|--------------------------------------------------------------------------
*/

app.get(
  "/api/moysklad/test",
  async (req, res) => {

    try {

      const result =
        await testMoySklad();

      res.json({
        success: true,
        message:
          "МойСклад подключен",
        ...result,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Ошибка подключения к МойСклад",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| ПОЛУЧИТЬ ТОВАРЫ МОЙСКЛАД
|--------------------------------------------------------------------------
*/

app.get(
  "/api/moysklad/products",
  async (req, res) => {

    try {

      const products =
        await getProducts();

      res.json({
        success: true,
        count:
          products.length,
        products,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения товаров",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| ПОЛУЧИТЬ ОДИН ТОВАР МОЙСКЛАД
|--------------------------------------------------------------------------
*/

app.get(
  "/api/moysklad/products/:id",
  async (req, res) => {

    try {

      const product =
        await getProductById(
          req.params.id
        );

      if (!product) {

        return res.status(404).json({
          success: false,
          message:
            "Товар не найден",
        });

      }

      res.json({
        success: true,
        product,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения товара",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| СИНХРОНИЗАЦИЯ МОЙСКЛАД → POSTGRESQL
|--------------------------------------------------------------------------
*/

async function syncMoySkladProducts() {

  console.log(
    "================================"
  );

  console.log(
    "🔄 НАЧАЛО СИНХРОНИЗАЦИИ МОЙСКЛАД"
  );


  const moyskladProducts =
    await getProducts();


  let created = 0;

  let updated = 0;


  for (
    const product
    of moyskladProducts
  ) {

    if (!product?.id) {
      continue;
    }


    const id =
      String(product.id);


    const title =
      String(
        product.name || ""
      );


    const price =
      Number(
        product.price || 0
      );


    const article =
      product.article ||
      product.code ||
      null;


    /*
    |--------------------------------------------------------------------------
    | Проверяем существует ли товар
    |--------------------------------------------------------------------------
    */

    const existing =
      await query(
        `
          SELECT id

          FROM products

          WHERE id = $1
        `,
        [id]
      );


    /*
    |--------------------------------------------------------------------------
    | Новый товар
    |--------------------------------------------------------------------------
    */

    if (
      existing.rows.length === 0
    ) {

      await query(
        `
          INSERT INTO products (

            id,

            title,

            article,

            price,

            description,

            memory,

            color,

            warranty,

            images,

            badge,

            hidden

          )

          VALUES (

            $1,
            $2,
            $3,
            $4,
            '',
            '',
            '',
            '',
            '[]'::jsonb,
            '',
            FALSE

          )
        `,
        [
          id,
          title,
          article,
          price,
        ]
      );


      created++;

    }


    /*
    |--------------------------------------------------------------------------
    | Обновляем только данные МойСклад
    |--------------------------------------------------------------------------
    */

    else {

      await query(
        `
          UPDATE products

          SET

            title = $1,

            article = $2,

            price = $3,

            updated_at = NOW()

          WHERE id = $4
        `,
        [
          title,
          article,
          price,
          id,
        ]
      );


      updated++;

    }

  }


  console.log(
    `📦 Всего: ${moyskladProducts.length}`
  );

  console.log(
    `➕ Создано: ${created}`
  );

  console.log(
    `🔄 Обновлено: ${updated}`
  );


  return {

    success: true,

    count:
      moyskladProducts.length,

    created,

    updated,

  };

}


/*
|--------------------------------------------------------------------------
| РУЧНАЯ СИНХРОНИЗАЦИЯ
|--------------------------------------------------------------------------
*/

app.post(
  "/api/moysklad/sync",
  async (req, res) => {

    try {

      const result =
        await syncMoySkladProducts();

      res.json(result);

    } catch (error) {

      console.error(
        "Ошибка синхронизации:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка синхронизации",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| 1С TEST
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/test",
  (req, res) => {

    if (
      !check1CAccess(req, res)
    ) {
      return;
    }

    res.json({

      success: true,

      message:
        "KUSAI MAX API подключен",

      serverTime:
        new Date().toISOString(),

    });

  }
);


/*
|--------------------------------------------------------------------------
| 1С КЛИЕНТ
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/client",
  async (req, res) => {

    try {

      if (
        !check1CAccess(req, res)
      ) {
        return;
      }


      const phone =
        normalizePhone(
          req.query.phone
        );


      if (!phone) {

        return res.status(400).json({
          success: false,
          message:
            "Некорректный телефон",
        });

      }


      const result =
        await query(
          `
            SELECT *

            FROM clients

            WHERE phone = $1

            LIMIT 1
          `,
          [phone]
        );


      if (
        result.rows.length === 0
      ) {

        return res.json({
          success: false,
          message:
            "Клиент не найден",
        });

      }


      const client =
        result.rows[0];


      res.json({

        success: true,

        client: {

          id:
            client.id,

          name:
            client.name,

          phone:
            client.phone,

          points:
            Number(
              client.points || 0
            ),

          status:
            client.status ||
            "MAX GOLD",

        },

      });

    } catch (error) {

      console.error(
        "Ошибка поиска клиента:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка сервера",
      });

    }

  }
);


/*
|--------------------------------------------------------------------------
| АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ
|--------------------------------------------------------------------------
*/

const SYNC_INTERVAL =
  30 * 60 * 1000;


async function runAutomaticSync() {

  try {

    console.log(
      "⏰ Автоматическая синхронизация"
    );

    const result =
      await syncMoySkladProducts();

    console.log(
      "✅ Синхронизация завершена",
      result
    );

  } catch (error) {

    console.error(
      "❌ Ошибка синхронизации:",
      error
    );

  }

}


/*
|--------------------------------------------------------------------------
| ЗАПУСК СЕРВЕРА
|--------------------------------------------------------------------------
*/

async function startServer() {

  try {

    await initializeDatabase();


    app.listen(
      PORT,
      async () => {

        console.log(
          `🚀 KUSAI MAX API запущен на порту ${PORT}`
        );


        /*
        |--------------------------------------------------------------------------
        | Первая синхронизация
        |--------------------------------------------------------------------------
        */

        await runAutomaticSync();


        /*
        |--------------------------------------------------------------------------
        | Синхронизация каждые 30 минут
        |--------------------------------------------------------------------------
        */

        setInterval(
          runAutomaticSync,
          SYNC_INTERVAL
        );

      }
    );

  } catch (error) {

    console.error(
      "❌ Ошибка запуска сервера:",
      error
    );

    process.exit(1);

  }

}


startServer();