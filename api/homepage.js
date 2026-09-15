import crypto from "crypto";

export function registerHomepageRoutes(app, pgQuery) {
  // =====================================================
  // CREATE TABLES
  // =====================================================

  async function initializeHomepageTables() {
    try {
      // -------------------------------------------------
      // ЭКСКЛЮЗИВ KUSAI MAX
      // -------------------------------------------------

      await pgQuery(`
        CREATE TABLE IF NOT EXISTS homepage_offer (
          id UUID PRIMARY KEY,
          badge TEXT NOT NULL DEFAULT 'Эксклюзив KUSAI MAX',
          title TEXT NOT NULL DEFAULT 'Персональное предложение',
          text TEXT NOT NULL DEFAULT '',
          discount TEXT NOT NULL DEFAULT '3%',
          button_text TEXT NOT NULL DEFAULT 'Смотреть предложения',
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // -------------------------------------------------
      // НОВИНКИ НЕДЕЛИ
      // -------------------------------------------------

      await pgQuery(`
        CREATE TABLE IF NOT EXISTS homepage_weekly_products (
          id UUID PRIMARY KEY,
          product_id TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pgQuery(`
            ALTER TABLE homepage_weekly_products
            ALTER COLUMN product_id TYPE TEXT
            USING product_id::TEXT
        `);

      await pgQuery(`
        CREATE INDEX IF NOT EXISTS idx_homepage_weekly_products_order
        ON homepage_weekly_products(sort_order)
      `);

      // -------------------------------------------------
      // НОВОСТИ КЛУБА
      // -------------------------------------------------

      await pgQuery(`
        CREATE TABLE IF NOT EXISTS club_news (
          id UUID PRIMARY KEY,
          date_label TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL,
          text TEXT NOT NULL DEFAULT '',
          button_text TEXT NOT NULL DEFAULT 'Подробнее',
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pgQuery(`
        CREATE INDEX IF NOT EXISTS idx_club_news_created_at
        ON club_news(created_at DESC)
      `);

      // -------------------------------------------------
      // СОЗДАЁМ ДЕФОЛТНЫЙ OFFER
      // -------------------------------------------------

      const offerResult = await pgQuery(`
        SELECT id
        FROM homepage_offer
        LIMIT 1
      `);

      if (offerResult.rows.length === 0) {
        await pgQuery(
          `
          INSERT INTO homepage_offer (
            id,
            badge,
            title,
            text,
            discount,
            button_text,
            enabled
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            crypto.randomUUID(),
            "Эксклюзив KUSAI MAX",
            "Персональное предложение",
            "Только для участников клуба действует персональная скидка на технику Apple до конца недели.",
            "3%",
            "Смотреть предложения",
            true,
          ]
        );
      }

      console.log("HOMEPAGE: таблицы готовы");
    } catch (error) {
      console.error(
        "HOMEPAGE: ошибка создания таблиц:",
        error
      );

      throw error;
    }
  }

  // =====================================================
  // OFFER
  // =====================================================

  app.get("/api/homepage/offer", async (req, res) => {
    try {
      const result = await pgQuery(`
        SELECT
          id,
          badge,
          title,
          text,
          discount,
          button_text,
          enabled,
          updated_at
        FROM homepage_offer
        ORDER BY updated_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          offer: null,
        });
      }

      const row = result.rows[0];

      return res.json({
        success: true,
        offer: {
          id: row.id,
          badge: row.badge,
          title: row.title,
          text: row.text,
          discount: row.discount,
          buttonText: row.button_text,
          enabled: Boolean(row.enabled),
          updatedAt: row.updated_at,
        },
      });
    } catch (error) {
      console.error(
        "GET HOMEPAGE OFFER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Ошибка загрузки эксклюзивного предложения",
        error: error.message,
      });
    }
  });

  app.patch("/api/homepage/offer", async (req, res) => {
    try {
      const {
        badge,
        title,
        text,
        discount,
        buttonText,
        enabled,
      } = req.body;

      const existing = await pgQuery(`
        SELECT id
        FROM homepage_offer
        ORDER BY updated_at DESC
        LIMIT 1
      `);

      let result;

      if (existing.rows.length === 0) {
        result = await pgQuery(
          `
          INSERT INTO homepage_offer (
            id,
            badge,
            title,
            text,
            discount,
            button_text,
            enabled,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
          RETURNING *
          `,
          [
            crypto.randomUUID(),
            badge || "Эксклюзив KUSAI MAX",
            title || "Персональное предложение",
            text || "",
            discount || "3%",
            buttonText || "Смотреть предложения",
            enabled !== false,
          ]
        );
      } else {
        result = await pgQuery(
          `
          UPDATE homepage_offer
          SET
            badge = $2,
            title = $3,
            text = $4,
            discount = $5,
            button_text = $6,
            enabled = $7,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
          `,
          [
            existing.rows[0].id,
            badge || "Эксклюзив KUSAI MAX",
            title || "Персональное предложение",
            text || "",
            discount || "3%",
            buttonText || "Смотреть предложения",
            enabled !== false,
          ]
        );
      }

      const row = result.rows[0];

      return res.json({
        success: true,
        offer: {
          id: row.id,
          badge: row.badge,
          title: row.title,
          text: row.text,
          discount: row.discount,
          buttonText: row.button_text,
          enabled: Boolean(row.enabled),
          updatedAt: row.updated_at,
        },
      });
    } catch (error) {
      console.error(
        "PATCH HOMEPAGE OFFER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Ошибка сохранения предложения",
        error: error.message,
      });
    }
  });

  // =====================================================
  // WEEKLY PRODUCTS
  // =====================================================

  app.get(
    "/api/homepage/weekly-products",
    async (req, res) => {
      try {
        const result = await pgQuery(`
          SELECT
            wp.id,
            wp.product_id,
            wp.sort_order,
            wp.enabled,

            p.title,
            p.name,
            p.price,
            p.images,
            p.description,
            p.article,
            p.code,
            p.external_code,
            p.barcode

          FROM homepage_weekly_products wp

          LEFT JOIN products p
            ON p.id = wp.product_id

          WHERE wp.enabled = TRUE

          ORDER BY
            wp.sort_order ASC,
            wp.created_at ASC
        `);

        const products = result.rows.map((row) => ({
          id: row.id,
          productId: row.product_id,

          title: row.title || row.name || "",
          name: row.name || row.title || "",

          price:
            row.price !== null
              ? Number(row.price)
              : 0,

          images: Array.isArray(row.images)
            ? row.images
            : [],

          description: row.description || "",
          article: row.article || "",
          code: row.code || "",
          externalCode: row.external_code || "",
          barcode: row.barcode || "",

          sortOrder: Number(row.sort_order || 0),
          enabled: Boolean(row.enabled),
        }));

        return res.json({
          success: true,
          products,
        });
      } catch (error) {
        console.error(
          "GET WEEKLY PRODUCTS ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Ошибка загрузки новинок недели",
          error: error.message,
        });
      }
    }
  );

  app.get(
    "/api/homepage/weekly-products/all",
    async (req, res) => {
      try {
        const result = await pgQuery(`
          SELECT
            wp.id,
            wp.product_id,
            wp.sort_order,
            wp.enabled,

            p.title,
            p.name,
            p.price,
            p.images

          FROM homepage_weekly_products wp

          LEFT JOIN products p
            ON p.id = wp.product_id

          ORDER BY
            wp.sort_order ASC,
            wp.created_at ASC
        `);

        return res.json({
          success: true,
          products: result.rows.map((row) => ({
            id: row.id,
            productId: row.product_id,
            title: row.title || row.name || "",
            name: row.name || row.title || "",
            price:
              row.price !== null
                ? Number(row.price)
                : 0,
            images: Array.isArray(row.images)
              ? row.images
              : [],
            sortOrder: Number(row.sort_order || 0),
            enabled: Boolean(row.enabled),
          })),
        });
      } catch (error) {
        console.error(
          "GET ALL WEEKLY PRODUCTS ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Ошибка загрузки списка новинок",
          error: error.message,
        });
      }
    }
  );

  app.post(
    "/api/homepage/weekly-products",
    async (req, res) => {
      try {
        const {
          productId,
          sortOrder,
          enabled,
        } = req.body;

        if (!productId) {
          return res.status(400).json({
            success: false,
            message: "Не указан productId",
          });
        }

        // Проверяем, существует ли товар
        const productResult = await pgQuery(
          `
          SELECT id
          FROM products
          WHERE id = $1
          LIMIT 1
          `,
          [productId]
        );

        if (productResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Товар не найден в каталоге",
          });
        }

        // Не даём добавить один товар дважды
        const duplicate = await pgQuery(
          `
          SELECT id
          FROM homepage_weekly_products
          WHERE product_id = $1
          LIMIT 1
          `,
          [productId]
        );

        if (duplicate.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Этот товар уже добавлен в новинки недели",
          });
        }

        const orderResult = await pgQuery(`
          SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
          FROM homepage_weekly_products
        `);

        const nextOrder = Number(
          orderResult.rows[0]?.next_order || 0
        );

        const result = await pgQuery(
          `
          INSERT INTO homepage_weekly_products (
            id,
            product_id,
            sort_order,
            enabled
          )
          VALUES ($1,$2,$3,$4)
          RETURNING *
          `,
          [
            crypto.randomUUID(),
            productId,
            sortOrder != null
              ? Number(sortOrder)
              : nextOrder,
            enabled !== false,
          ]
        );

        return res.json({
          success: true,
          item: result.rows[0],
        });
      } catch (error) {
        console.error(
          "POST WEEKLY PRODUCT ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Ошибка добавления товара в новинки",
          error: error.message,
        });
      }
    }
  );

  app.patch(
    "/api/homepage/weekly-products/:id",
    async (req, res) => {
      try {
        const { id } = req.params;
        const {
          sortOrder,
          enabled,
        } = req.body;

        const result = await pgQuery(
          `
          UPDATE homepage_weekly_products
          SET
            sort_order = COALESCE($2, sort_order),
            enabled = COALESCE($3, enabled)
          WHERE id = $1
          RETURNING *
          `,
          [
            id,
            sortOrder != null
              ? Number(sortOrder)
              : null,
            typeof enabled === "boolean"
              ? enabled
              : null,
          ]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Новинка не найдена",
          });
        }

        return res.json({
          success: true,
          item: result.rows[0],
        });
      } catch (error) {
        console.error(
          "PATCH WEEKLY PRODUCT ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Ошибка изменения новинки",
          error: error.message,
        });
      }
    }
  );

  app.delete(
    "/api/homepage/weekly-products/:id",
    async (req, res) => {
      try {
        const { id } = req.params;

        const result = await pgQuery(
          `
          DELETE FROM homepage_weekly_products
          WHERE id = $1
          RETURNING id
          `,
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Новинка не найдена",
          });
        }

        return res.json({
          success: true,
        });
      } catch (error) {
        console.error(
          "DELETE WEEKLY PRODUCT ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Ошибка удаления новинки",
          error: error.message,
        });
      }
    }
  );

  // =====================================================
  // CLUB NEWS
  // =====================================================

  app.get("/api/club-news", async (req, res) => {
    try {
      const result = await pgQuery(`
        SELECT
          id,
          date_label,
          title,
          text,
          button_text,
          enabled,
          created_at,
          updated_at
        FROM club_news
        WHERE enabled = TRUE
        ORDER BY created_at DESC
      `);

      return res.json({
        success: true,
        news: result.rows.map((row) => ({
          id: row.id,
          dateLabel: row.date_label,
          title: row.title,
          text: row.text,
          buttonText: row.button_text,
          enabled: Boolean(row.enabled),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      });
    } catch (error) {
      console.error(
        "GET CLUB NEWS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Ошибка загрузки новостей",
        error: error.message,
      });
    }
  });

  app.get(
    "/api/club-news/all",
    async (req, res) => {
      try {
        const result = await pgQuery(`
          SELECT
            id,
            date_label,
            title,
            text,
            button_text,
            enabled,
            created_at,
            updated_at
          FROM club_news
          ORDER BY created_at DESC
        `);

        return res.json({
          success: true,
          news: result.rows.map((row) => ({
            id: row.id,
            dateLabel: row.date_label,
            title: row.title,
            text: row.text,
            buttonText: row.button_text,
            enabled: Boolean(row.enabled),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })),
        });
      } catch (error) {
        console.error(
          "GET ALL CLUB NEWS ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Ошибка загрузки всех новостей",
          error: error.message,
        });
      }
    }
  );

  app.post("/api/club-news", async (req, res) => {
    try {
      const {
        dateLabel,
        title,
        text,
        buttonText,
        enabled,
      } = req.body;

      if (!title || !String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: "Заголовок новости обязателен",
        });
      }

      const result = await pgQuery(
        `
        INSERT INTO club_news (
          id,
          date_label,
          title,
          text,
          button_text,
          enabled
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
        `,
        [
          crypto.randomUUID(),
          String(dateLabel || ""),
          String(title).trim(),
          String(text || ""),
          String(buttonText || "Подробнее"),
          enabled !== false,
        ]
      );

      const row = result.rows[0];

      return res.json({
        success: true,
        news: {
          id: row.id,
          dateLabel: row.date_label,
          title: row.title,
          text: row.text,
          buttonText: row.button_text,
          enabled: Boolean(row.enabled),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    } catch (error) {
      console.error(
        "POST CLUB NEWS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Ошибка создания новости",
        error: error.message,
      });
    }
  });

  app.patch(
    "/api/club-news/:id",
    async (req, res) => {
      try {
        const { id } = req.params;

        const {
          dateLabel,
          title,
          text,
          buttonText,
          enabled,
        } = req.body;

        if (!title || !String(title).trim()) {
          return res.status(400).json({
            success: false,
            message: "Заголовок новости обязателен",
          });
        }

        const result = await pgQuery(
          `
          UPDATE club_news
          SET
            date_label = $2,
            title = $3,
            text = $4,
            button_text = $5,
            enabled = $6,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
          `,
          [
            id,
            String(dateLabel || ""),
            String(title).trim(),
            String(text || ""),
            String(buttonText || "Подробнее"),
            enabled !== false,
          ]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Новость не найдена",
          });
        }

        const row = result.rows[0];

        return res.json({
          success: true,
          news: {
            id: row.id,
            dateLabel: row.date_label,
            title: row.title,
            text: row.text,
            buttonText: row.button_text,
            enabled: Boolean(row.enabled),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          },
        });
      } catch (error) {
        console.error(
          "PATCH CLUB NEWS ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Ошибка изменения новости",
          error: error.message,
        });
      }
    }
  );

  app.delete(
    "/api/club-news/:id",
    async (req, res) => {
      try {
        const { id } = req.params;

        const result = await pgQuery(
          `
          DELETE FROM club_news
          WHERE id = $1
          RETURNING id
          `,
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Новость не найдена",
          });
        }

        return res.json({
          success: true,
        });
      } catch (error) {
        console.error(
          "DELETE CLUB NEWS ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Ошибка удаления новости",
          error: error.message,
        });
      }
    }
  );

  return initializeHomepageTables;
}