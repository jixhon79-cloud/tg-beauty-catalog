-- ============================================================
-- tg-beauty-catalog — миграция базы данных
-- Запустить в Supabase: Dashboard → SQL Editor → New query → вставить всё → Run
-- ============================================================


-- ============================================================
-- ТАБЛИЦА: masters (мастера)
-- В MVP будет одна запись — наш мастер.
-- tg_bot_token НЕ хранится в БД — только в переменной окружения BOT_TOKEN
-- ============================================================
CREATE TABLE IF NOT EXISTS masters (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  title         TEXT,
  tagline       TEXT,
  address       TEXT,
  metro         TEXT,
  map_url       TEXT,
  working_hours TEXT,
  photo_url     TEXT,
  rating        NUMERIC(3,2) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  works_count   INT DEFAULT 0,
  clients_count INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- ТАБЛИЦА: services (услуги мастера)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  master_id   INT NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  short_desc  TEXT,
  description TEXT,
  category    TEXT,
  duration    INT,           -- минуты (ВАЖНО: используется при расчёте занятых слотов)
  price       INT,           -- рубли
  popular     BOOLEAN DEFAULT false,
  emoji       TEXT,
  gradient    TEXT,
  sort_order  INT DEFAULT 0,
  active      BOOLEAN DEFAULT true
);


-- ============================================================
-- ТАБЛИЦА: bookings (записи клиентов)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id           SERIAL PRIMARY KEY,
  master_id    INT NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  service_id   INT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  tg_user_id   BIGINT NOT NULL,   -- Telegram user ID (числовой, уникальный на весь Telegram)
  tg_username  TEXT,              -- @username (может меняться, не использовать как ID)
  client_name  TEXT NOT NULL,     -- имя из Telegram
  date         DATE NOT NULL,
  time         TIME NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed', 'cancelled')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ
  -- УБРАН неправильный UNIQUE (master_id, date, time, tg_user_id):
  -- он не защищал слот от двух разных клиентов.
  -- Вместо него — partial unique index ниже.
);

-- ГЛАВНЫЙ индекс: один подтверждённый слот — одна запись.
-- Partial (WHERE status = 'confirmed') позволяет переиспользовать
-- отменённые слоты — новый клиент может занять место после отмены.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_unique
  ON bookings (master_id, date, time)
  WHERE status = 'confirmed';

-- Защита от дублей: один клиент не может иметь две активные записи
-- на одно и то же время к одному мастеру
CREATE UNIQUE INDEX IF NOT EXISTS bookings_client_slot_unique
  ON bookings (master_id, date, time, tg_user_id)
  WHERE status = 'confirmed';

-- Индекс для быстрого поиска занятых слотов по дате
CREATE INDEX IF NOT EXISTS bookings_master_date_idx
  ON bookings (master_id, date)
  WHERE status = 'confirmed';

-- Индекс для быстрого поиска записей конкретного клиента
CREATE INDEX IF NOT EXISTS bookings_tg_user_idx
  ON bookings (tg_user_id);


-- ============================================================
-- ТАБЛИЦА: reviews (отзывы)
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  master_id   INT NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  booking_id  INT REFERENCES bookings(id) ON DELETE SET NULL,  -- подтверждает что клиент был
  tg_user_id  BIGINT,
  author_name TEXT NOT NULL,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — защита данных
-- ============================================================

ALTER TABLE masters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews  ENABLE ROW LEVEL SECURITY;

-- Мастера: анонимный читает всё КРОМЕ служебных полей.
-- tg_bot_token удалён из таблицы — токен хранится только в env.
CREATE POLICY "masters: public read"
  ON masters FOR SELECT
  TO anon
  USING (true);

-- Услуги: читать активные можно, писать — нет
CREATE POLICY "services: public read active"
  ON services FOR SELECT
  TO anon
  USING (active = true);

-- Записи: анонимный доступ ЗАПРЕЩЁН — только через service_role с сервера
-- (сервер использует service_role ключ, который обходит RLS)

-- Отзывы: читать можно, писать — нет
CREATE POLICY "reviews: public read"
  ON reviews FOR SELECT
  TO anon
  USING (true);


-- ============================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: мастер
-- ============================================================
INSERT INTO masters (
  name, title, tagline,
  address, metro, map_url, working_hours, photo_url,
  rating, reviews_count, works_count, clients_count
) VALUES (
  'Анна Соколова',
  'Мастер маникюра и педикюра',
  'Делаю ногти, которыми хочется хвастаться',
  'Москва, ул. Сивцев Вражек, 15',
  'м. Арбат, 5 мин пешком',
  'https://yandex.ru/maps/?text=Москва+Сивцев+Вражек+15',
  'Пн–Сб, 10:00–20:00',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop&auto=format&q=80',
  4.9, 42, 128, 248
);


-- ============================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: услуги
-- duration в минутах — используется в api/slots.js
-- для блокировки нескольких слотов при длинных услугах
-- ============================================================
INSERT INTO services (master_id, name, short_desc, description, category, duration, price, popular, emoji, gradient, sort_order) VALUES
(1, 'Маникюр с гель-лаком',     'Стойкое покрытие до 3 недель',   'Стойкое покрытие до 3 недель — не скалывается и не тускнеет. Включает: аппаратная обработка, уход за кутикулой, цветное гель-лаковое покрытие на выбор из 200+ оттенков.', 'Маникюр',    60,  2500, true,  '💅', 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 60%, #e91e63 100%)', 1),
(1, 'Маникюр без покрытия',      'Уход и форма без лака',          'Аппаратный маникюр с полным уходом за ногтями и кутикулой. Без покрытия — идеально перед отпуском.', 'Маникюр',    45,  1800, false, '✨', 'linear-gradient(135deg, #f3e5f5 0%, #ce93d8 60%, #9c27b0 100%)', 2),
(1, 'Педикюр с гель-лаком',      'Ухоженные стопы до 4 недель',    'Полный уход за стопами: обработка, пилинг, маска, увлажнение + стойкое покрытие. Результат до 4 недель.', 'Педикюр',    90,  3500, true,  '🌸', 'linear-gradient(135deg, #e8f5e9 0%, #81c784 60%, #388e3c 100%)', 3),
(1, 'Педикюр без покрытия',      'Уход за стопами без лака',       'Аппаратный педикюр: обработка кожи и мозолей, уход за кутикулой, полировка ногтей.', 'Педикюр',    75,  2800, false, '🍃', 'linear-gradient(135deg, #e0f7fa 0%, #80deea 60%, #00838f 100%)', 4),
(1, 'Наращивание ногтей (гель)', 'Длина и форма на 3–4 недели',    'Наращивание любой длины и формы. Гипоаллергенный гель премиум-класса. Дизайн оплачивается отдельно.', 'Наращивание', 150, 5500, false, '💎', 'linear-gradient(135deg, #fff8e1 0%, #ffe082 60%, #ff8f00 100%)', 5),
(1, 'Ногтевой дизайн',           'Авторский дизайн на покрытие',   'Сложный авторский дизайн: градиент, стемпинг, фольга, стразы, ручная роспись. Цена за полное покрытие.', 'Дизайн',     60,  2000, false, '🎨', 'linear-gradient(135deg, #fbe9e7 0%, #ff8a65 60%, #e64a19 100%)', 6),
(1, 'Снятие гель-лака',          'Безопасное снятие без ущерба',   'Профессиональное снятие без повреждения натурального ногтя. Включает распаривание и уход.', 'Маникюр',    30,  800,  false, '🧴', 'linear-gradient(135deg, #ede7f6 0%, #b39ddb 60%, #512da8 100%)', 7);


-- ============================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: отзывы
-- ============================================================
INSERT INTO reviews (master_id, tg_user_id, author_name, rating, text) VALUES
(1, NULL, 'Мария К.',      5, 'Делаю маникюр у Анны уже полгода. Покрытие держится всегда дольше обещанного — 3,5 недели легко! Дизайны получаются аккуратными и ровными.'),
(1, NULL, 'Екатерина Н.',  5, 'Пришла первый раз — осталась навсегда. Педикюр сделан идеально, пятки стали мягкими как у ребёнка.'),
(1, NULL, 'Ольга Р.',      5, 'Анна — настоящий мастер своего дела. Нарастила ногти к свадьбе сестры, держатся уже 5 недель без единого скола.'),
(1, NULL, 'Дарья С.',      4, 'В целом очень довольна. Маникюр аккуратный, цены адекватные. Единственное — нужно планировать заранее, записи быстро заканчиваются.');
