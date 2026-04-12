# CLAUDE.md — Навигация по проекту

## Что это
Telegram Mini App: каталог услуг бьюти-мастера + онлайн-запись.
Одна страница (SPA), vanilla HTML/CSS/JS, без сборщиков.

---

## Файлы и их роль

| Файл | За что отвечает |
|------|----------------|
| `index.html` | Точка входа. HTML-оболочка, подключение скриптов и стилей, таб-бар |
| `css/style.css` | Все стили. Переменные темы Telegram, компоненты, экраны, анимации |
| `js/data.js` | **Все контентные данные**: профиль мастера, услуги, отзывы, слоты. Менять данные — только здесь |
| `js/app.js` | Вся логика: состояние, навигация, рендер экранов, события |
| `brief.md` | Продуктовый бриф: экраны, переходы, что есть в MVP |
| `research.md` | Исследование рынка и экспертная оценка |

---

## Где менять данные

### Профиль мастера (имя, адрес, рейтинг)
→ `js/data.js`, объект `MASTER` (начало файла)

### Услуги (название, цена, длительность, описание)
→ `js/data.js`, массив `SERVICES`

### Категории услуг
→ `js/data.js`, массив `CATEGORIES`

### Отзывы
→ `js/data.js`, массив `REVIEWS`

### Рабочие часы и слоты
→ `js/data.js`, константа `TIME_SLOTS` и функция `getOccupiedSlots()`

### Цвета (акцент, фон)
→ `css/style.css`, блок `:root { }` в начале файла.
  Telegram автоматически подставляет свои цвета через `--tg-theme-*`.
  Для браузерного превью — менять fallback-значения.

### Фото-заглушки → реальные фото
→ В `js/data.js` каждая услуга имеет поле `gradient` (CSS-градиент).
  Чтобы добавить реальное фото: добавь поле `photo: 'путь/к/фото.jpg'`
  и в `app.js` в функции `servicePhotoHtml()` добавь проверку на наличие `photo`.

---

## Навигация между экранами

```
[Таб: Главная]          [Таб: Услуги]       [Таб: Записи]
     │                        │                    │
  renderHome()          renderCatalog()    renderAppointments()
     │                        │
     │                  renderService(id)
     │                        │
     └──────────────── renderBooking(serviceId)
                              │
                        renderConfirm()
                              │
                        renderSuccess()

Из Главной:
  → галерея → renderGallery()
  → отзывы  → renderReviews()
```

### Как добавить новый экран
1. Написать функцию `renderMyScreen()` в `js/app.js`
2. Добавить кейс в `switch` внутри `renderCurrentScreen()`
3. Использовать `navigate('myScreen', { params })` для перехода
4. Настроить `MainButton` и `BackButton` внутри функции рендера

---

## Как запустить локально

```bash
# Вариант 1 — Python (встроен в macOS/Linux)
cd tg-beauty-catalog
python -m http.server 8080

# Вариант 2 — Node.js
npx serve .

# Вариант 3 — VS Code
# Установить расширение "Live Server", правый клик на index.html → "Open with Live Server"
```

Открыть: http://localhost:8080

> В браузере Telegram SDK не работает — кнопки MainButton/BackButton не будут видны.
> Логика навигации работает, остальное нужно тестировать в Telegram.

---

## Как подключить к Telegram

1. Создать бота через @BotFather → получить токен
2. Задеплоить файлы на хостинг с HTTPS (Vercel, Netlify, Railway — всё бесплатно)
3. В @BotFather: Menu → Web App → указать URL задеплоенного сайта
4. Открыть Mini App через бота

---

## Состояние приложения (state в app.js)

```js
state = {
  screen: 'home',           // текущий экран
  screenParams: {},          // параметры экрана
  navStack: [...],           // стек навигации (для BackButton)
  activeTab: 'home',         // активная вкладка таб-бара
  activeCategory: 'Все',     // активная категория в каталоге
  booking: {
    serviceId: null,         // id выбранной услуги
    date: null,              // выбранная дата (YYYY-MM-DD)
    time: null,              // выбранное время (HH:MM)
    calendarMonth: N,        // месяц в календаре (0–11)
    calendarYear: YYYY,      // год в календаре
  },
  appointments: [...],       // записи пользователя
  mainButtonHandler: null,   // текущий обработчик MainButton
}
```

---

## Telegram SDK — что используется

| API | Где используется |
|-----|-----------------|
| `MainButton` | Основная кнопка действия на каждом экране |
| `BackButton` | Навигация назад на всех экранах кроме таб-рутовых |
| `HapticFeedback` | При подтверждении записи и ошибке |
| `showConfirm()` | При отмене записи |
| `showAlert()` | При ошибке бронирования |
| `openLink()` | Открытие карты в Яндекс.Картах |
| `initDataUnsafe.user` | Имя пользователя для экрана подтверждения |
| `viewportStableHeight` | Правильная высота окна |
| `colorScheme` | Светлая/тёмная тема |

---

*Обновлено: 11 апреля 2026*
