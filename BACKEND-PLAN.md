# BACKEND-PLAN.md

> Бэкенд-архитектура для tg-beauty-catalog  
> MVP: один мастер, Telegram Mini App, онлайн-запись

---

## Что сейчас (без бэкенда)

- Все данные захардкожены в `js/data.js`
- Записи хранятся только в памяти браузера (теряются при перезагрузке)
- Слоты — псевдослучайный алгоритм, не реальные данные
- Уведомлений нет

---

## Что нужно от бэкенда

1. **Хранить записи** клиентов (не теряться при перезагрузке)
2. **Реальная занятость слотов** (видеть что занято у других клиентов)
3. **Telegram-уведомления** (подтверждение, напоминание за 24ч и 2ч)
4. **Мастер видит свои записи** (личный кабинет мастера — опционально MVP+)

---

## Стек

| Компонент | Выбор | Почему |
|-----------|-------|--------|
| Runtime | Node.js (Express) | прост, хорошо дружит с Telegram Bot API |
| База данных | Supabase (PostgreSQL) | бесплатный tier, встроенный REST API, Auth, Realtime |
| Деплой API | Vercel Functions | тот же проект, бесплатно |
| Бот | node-telegram-bot-api | простая обёртка над Bot API |
| Валидация Telegram | HMAC-SHA256 | обязательно, защита от фейковых запросов |

---

## Модели данных

### `masters` (один мастер в MVP, таблица нужна для будущего масштабирования)
```sql
id            SERIAL PRIMARY KEY
-- tg_bot_token НЕ хранится в БД — только в env BOT_TOKEN (безопасность)
name          TEXT NOT NULL
title         TEXT
tagline       TEXT
address       TEXT
metro         TEXT
map_url       TEXT
working_hours TEXT
photo_url     TEXT
rating        NUMERIC(3,2) DEFAULT 0
reviews_count INT DEFAULT 0
works_count   INT DEFAULT 0
clients_count INT DEFAULT 0
created_at    TIMESTAMPTZ DEFAULT now()
```

### `services`
```sql
id          SERIAL PRIMARY KEY
master_id   INT REFERENCES masters(id)
name        TEXT NOT NULL
short_desc  TEXT
description TEXT
category    TEXT
duration    INT              -- минуты
price       INT              -- рубли
popular     BOOLEAN DEFAULT false
emoji       TEXT
gradient    TEXT
sort_order  INT DEFAULT 0
active      BOOLEAN DEFAULT true
```

### `bookings`
```sql
id          SERIAL PRIMARY KEY
master_id   INT REFERENCES masters(id)
service_id  INT REFERENCES services(id)
tg_user_id  BIGINT NOT NULL    -- Telegram user ID клиента
tg_username TEXT               -- @username если есть
client_name TEXT NOT NULL      -- first_name + last_name из Telegram
date        DATE NOT NULL
time        TIME NOT NULL
status      TEXT DEFAULT 'confirmed'  -- confirmed | cancelled
created_at  TIMESTAMPTZ DEFAULT now()
cancelled_at TIMESTAMPTZ

-- Индексы (вместо UNIQUE constraint в таблице):
-- UNIQUE INDEX (master_id, date, time) WHERE status = 'confirmed'
--   → один слот = одна активная запись (защита от двойного бронирования)
-- UNIQUE INDEX (master_id, date, time, tg_user_id) WHERE status = 'confirmed'
--   → один клиент не может дважды занять один слот
-- Partial index (WHERE confirmed) позволяет переиспользовать отменённые слоты
```

### `reviews`
```sql
id          SERIAL PRIMARY KEY
master_id   INT REFERENCES masters(id)
booking_id  INT REFERENCES bookings(id)  -- верификация: был на записи
tg_user_id  BIGINT
author_name TEXT NOT NULL
rating      INT CHECK (rating BETWEEN 1 AND 5)
text        TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

---

## API эндпоинты

Базовый URL: `/api`  
Все запросы от Mini App передают заголовок `X-Telegram-Init-Data` для верификации.

### Профиль мастера
```
GET /api/master
→ { name, title, tagline, photo_url, rating, reviews_count, works_count, address, metro, map_url, working_hours }
```

### Услуги
```
GET /api/services?category=Маникюр
→ [{ id, name, short_desc, description, category, duration, price, popular, emoji, gradient, photos }]
```

### Свободные слоты
```
GET /api/slots?date=2026-04-15&service_id=1
→ {
    available: ['10:00', '11:00', '14:00', ...],
    occupied:  ['12:00', '13:00', ...]
  }
```
Логика: берём `TIME_SLOTS`, для каждой подтверждённой записи блокируем
`ceil(duration / SLOT_INTERVAL)` слотов начиная со времени записи.  
Пример: наращивание 150 мин при шаге 60 мин → занято 10:00, 11:00, 12:00.  
Не показываем слоты в прошлом и воскресенья.

### Записи клиента
```
GET /api/bookings          -- записи текущего пользователя (из tg initData)
→ [{ id, service, date, time, status }]

POST /api/bookings
Body: { service_id, date, time }
→ { id, status: 'confirmed' }
  или 400 { error: 'slot_taken' } если слот уже занят

DELETE /api/bookings/:id   -- отмена записи
→ { status: 'cancelled' }
```

### Отзывы
```
GET /api/reviews?limit=20&offset=0
→ [{ id, author_name, rating, text, service_name, created_at, verified }]
```

---

## Коды ошибок API

Все ошибки возвращают `{ error: 'код', message: 'текст для разработчика' }`.

| Ситуация | HTTP | error |
|----------|------|-------|
| Слот уже занят | 400 | `slot_taken` |
| Услуга не найдена | 404 | `service_not_found` |
| Дата в прошлом | 400 | `date_in_past` |
| Дата слишком далеко (>60 дней) | 400 | `date_too_far` |
| Невалидный Telegram initData | 401 | `auth_failed` |
| Запись не принадлежит пользователю | 403 | `forbidden` |
| Ошибка БД / внешняя недоступна | 500 | `internal_error` |

Уведомление не отправилось (бот заблокирован) — **запись сохраняется**, ошибка логируется.

---

## Верификация Telegram

Каждый запрос от Mini App проверяется на сервере:

```js
// Клиент отправляет:
headers: { 'X-Telegram-Init-Data': window.Telegram.WebApp.initData }

// Сервер проверяет HMAC-SHA256:
const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
if (hash !== receivedHash) return 401
```

Из верифицированного `initData` берём `user.id` — это и есть идентификатор клиента.

---

## Telegram-уведомления (бот)

Бот отправляет сообщения автоматически через `sendMessage`:

| Событие | Когда | Текст |
|---------|-------|-------|
| Запись создана | сразу | «✅ Вы записаны: [услуга], [дата], [время]. Адрес: ...» |
| Напоминание | за 24 ч | «⏰ Напоминаем: завтра в [время] — [услуга]. Подтвердить?» |
| Напоминание | за 2 ч | «📍 Ждём вас сегодня в [время]. [Адрес]» |
| Отмена | при отмене | «Запись отменена. Хотите выбрать другое время?» + кнопка |

Cron для напоминаний: Vercel Cron Job, запускается каждый час, ищет записи через 24ч и 2ч.

---

## Структура файлов бэкенда

```
api/
├── master.js          GET /api/master
├── services.js        GET /api/services
├── slots.js           GET /api/slots
├── bookings.js        GET + POST + DELETE /api/bookings
├── reviews.js         GET /api/reviews
├── bot/
│   └── webhook.js     POST /api/bot/webhook (входящие от бота)
└── _lib/
    ├── supabase.js    клиент Supabase (createClient)
    ├── auth.js        верификация Telegram initData
    └── notify.js      отправка уведомлений через бота
```

---

## Переменные окружения

```env
BOT_TOKEN=                  # @BotFather
SUPABASE_URL=               # https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=  # Settings → API → service_role (только на сервере!)
MASTER_ID=1                 # ID мастера в таблице masters (MVP = 1)
```

---

## Что менять в фронтенде

После подключения бэкенда заменить в `js/app.js`:

| Сейчас | После |
|--------|-------|
| `DEMO_APPOINTMENTS` из `data.js` | `GET /api/bookings` при загрузке |
| `getOccupiedSlots(dateStr)` — хэш-алгоритм | `GET /api/slots?date=` |
| `state.appointments.push(...)` при записи | `POST /api/bookings` |
| Отмена через `filter` в `state` | `DELETE /api/bookings/:id` |

Профиль мастера и услуги в MVP можно оставить в `data.js` — они не меняются часто.  
Переносить на API только когда появится кабинет мастера.

---

## Порядок разработки

1. `_lib/supabase.js` — клиент Supabase, создать таблицы через SQL-редактор в Dashboard
2. `_lib/auth.js` — верификация initData
3. `api/slots.js` — самый нужный эндпоинт (реальная занятость)
4. `api/bookings.js` — POST создание, GET список
5. `_lib/notify.js` + уведомление при создании записи
6. Cron-напоминания
7. Кабинет мастера (v2)

---

*Составлено: 14 апреля 2026*
