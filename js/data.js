/**
 * data.js — все контентные данные приложения
 * Чтобы изменить профиль мастера, услуги или отзывы — редактируй этот файл.
 */

// ============================================================
// ПРОФИЛЬ МАСТЕРА
// ============================================================
const MASTER = {
  name: 'Анна Соколова',
  title: 'Мастер маникюра и педикюра',
  tagline: 'Делаю ногти, которыми хочется хвастаться',
  initials: 'АС',          // для аватара-заглушки
  rating: 4.9,
  reviewsCount: 42,
  worksCount: 128,
  clientsCount: 248,
  experience: '5 лет опыта',
  address: 'Москва, ул. Сивцев Вражек, 15',
  metro: 'м. Арбат, 5 мин пешком',
  // Замени на реальную ссылку после получения адреса
  mapUrl: 'https://yandex.ru/maps/?text=Москва+Сивцев+Вражек+15',
  workingHours: 'Пн–Сб, 10:00–20:00',
  // Аватар мастера — заменить на реальное фото (images/master.jpg)
  photo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop&auto=format&q=80',
};

// ============================================================
// КАТЕГОРИИ УСЛУГ
// ============================================================
const CATEGORIES = ['Все', 'Маникюр', 'Педикюр', 'Наращивание', 'Дизайн'];

// ============================================================
// УСЛУГИ
// ============================================================
// Каждая услуга: id, category, name, shortDesc, description,
//   duration (мин), price (₽), popular (bool),
//   emoji (для заглушки), gradient (CSS-градиент для заглушки)
//   photosCount (сколько фото-заглушек показывать)
//   photo: 'путь' (раскомментируй для реального фото)
const SERVICES = [
  {
    id: 1,
    category: 'Маникюр',
    name: 'Маникюр с гель-лаком',
    shortDesc: 'Стойкое покрытие до 3 недель',
    description: 'Стойкое покрытие до 3 недель — не скалывается и не тускнеет. Включает: аппаратная обработка, уход за кутикулой, цветное гель-лаковое покрытие на выбор из 200+ оттенков.',
    duration: 60,
    price: 2500,
    popular: true,
    emoji: '💅',
    gradient: 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 60%, #e91e63 100%)',
    // Реальные фото с Unsplash — заменить на свои (images/manicure-1.jpg и т.д.)
    photos: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1604654894640-3d8aba1bd6b5?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1604654894619-3d8aba1bd6b5?w=600&h=450&fit=crop&auto=format&q=80',
    ],
  },
  {
    id: 2,
    category: 'Маникюр',
    name: 'Маникюр без покрытия',
    shortDesc: 'Уход и форма без лака',
    description: 'Аппаратный маникюр с полным уходом за ногтями и кутикулой. Без покрытия — идеально перед отпуском, после снятия наращивания или для тех, кто любит натуральные ногти.',
    duration: 45,
    price: 1800,
    popular: false,
    emoji: '✨',
    gradient: 'linear-gradient(135deg, #f3e5f5 0%, #ce93d8 60%, #9c27b0 100%)',
    photos: [
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1604902396830-aca55e311b54?w=600&h=450&fit=crop&auto=format&q=80',
    ],
  },
  {
    id: 3,
    category: 'Педикюр',
    name: 'Педикюр с гель-лаком',
    shortDesc: 'Ухоженные стопы до 4 недель',
    description: 'Полный уход за стопами: аппаратная обработка огрубевшей кожи, пилинг, питательная маска, увлажнение + стойкое покрытие гель-лаком. Результат держится до 4 недель.',
    duration: 90,
    price: 3500,
    popular: true,
    emoji: '🌸',
    gradient: 'linear-gradient(135deg, #e8f5e9 0%, #81c784 60%, #388e3c 100%)',
    photos: [
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=600&h=450&fit=crop&auto=format&q=80',
    ],
  },
  {
    id: 4,
    category: 'Педикюр',
    name: 'Педикюр без покрытия',
    shortDesc: 'Уход за стопами без лака',
    description: 'Аппаратный педикюр: обработка огрубевшей кожи и мозолей, уход за кутикулой, полировка ногтевой пластины до зеркального блеска. Без покрытия.',
    duration: 75,
    price: 2800,
    popular: false,
    emoji: '🍃',
    gradient: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 60%, #00838f 100%)',
    photos: [
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=450&fit=crop&auto=format&q=80',
    ],
  },
  {
    id: 5,
    category: 'Наращивание',
    name: 'Наращивание ногтей (гель)',
    shortDesc: 'Длина и форма на 3–4 недели',
    description: 'Наращивание на форму любой длины и формы: миндаль, балерина, квадрат, овал. Гипоаллергенный гель премиум-класса. Включает форму, длину и базовое покрытие. Дизайн оплачивается отдельно.',
    duration: 150,
    price: 5500,
    popular: false,
    emoji: '💎',
    gradient: 'linear-gradient(135deg, #fff8e1 0%, #ffe082 60%, #ff8f00 100%)',
    photos: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1604902396830-aca55e311b54?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1515688594390-b649af70d282?w=600&h=450&fit=crop&auto=format&q=80',
    ],
  },
  {
    id: 6,
    category: 'Дизайн',
    name: 'Ногтевой дизайн',
    shortDesc: 'Авторский дизайн на готовое покрытие',
    description: 'Сложный авторский дизайн на уже готовое покрытие: градиент, стемпинг, фольга, стразы, втирка, ручная роспись. Цена — за полное покрытие всех ногтей. Фото референса приветствуется.',
    duration: 60,
    price: 2000,
    popular: false,
    emoji: '🎨',
    gradient: 'linear-gradient(135deg, #fbe9e7 0%, #ff8a65 60%, #e64a19 100%)',
    photos: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1604902396830-aca55e311b54?w=600&h=450&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=450&fit=crop&auto=format&q=80',
    ],
  },
  {
    id: 7,
    category: 'Маникюр',
    name: 'Снятие гель-лака',
    shortDesc: 'Безопасное снятие без ущерба',
    description: 'Профессиональное снятие гель-лака без повреждения натурального ногтя. Включает: распаривание, аккуратное снятие, обработка кутикулы, уход за ногтевой пластиной.',
    duration: 30,
    price: 800,
    popular: false,
    emoji: '🧴',
    gradient: 'linear-gradient(135deg, #ede7f6 0%, #b39ddb 60%, #512da8 100%)',
    photos: [
      'https://images.unsplash.com/photo-1515688594390-b649af70d282?w=600&h=450&fit=crop&auto=format&q=80',
    ],
  },
];

// ============================================================
// ОТЗЫВЫ
// ============================================================
const REVIEWS = [
  {
    id: 1,
    name: 'Мария К.',
    initials: 'МК',
    rating: 5,
    service: 'Маникюр с гель-лаком',
    text: 'Делаю маникюр у Анны уже полгода. Покрытие держится всегда дольше обещанного — 3,5 недели легко! Дизайны получаются аккуратными и ровными. Время на приёме пролетает незаметно.',
    date: '8 апреля 2026',
    verified: true,
  },
  {
    id: 2,
    name: 'Екатерина Н.',
    initials: 'ЕН',
    rating: 5,
    service: 'Педикюр с гель-лаком',
    text: 'Пришла первый раз — осталась навсегда. Педикюр сделан идеально, пятки стали мягкими как у ребёнка. Уже записалась на следующий раз, даже не уходя из кабинета!',
    date: '3 апреля 2026',
    verified: true,
  },
  {
    id: 3,
    name: 'Ольга Р.',
    initials: 'ОР',
    rating: 5,
    service: 'Наращивание ногтей',
    text: 'Анна — настоящий мастер своего дела. Нарастила ногти к свадьбе сестры, держатся уже 5 недель без единого скола. Форма идеальная, все завидуют. Всем советую!',
    date: '28 марта 2026',
    verified: true,
  },
  {
    id: 4,
    name: 'Дарья С.',
    initials: 'ДС',
    rating: 4,
    service: 'Маникюр с гель-лаком',
    text: 'В целом очень довольна. Маникюр аккуратный, цены адекватные, мастер внимательная. Единственное — на ближайшую неделю записи уже нет, нужно планировать заранее.',
    date: '21 марта 2026',
    verified: true,
  },
];

// ============================================================
// РАБОЧИЕ СЛОТЫ ВРЕМЕНИ
// Менять здесь, если мастер работает в другие часы
// ============================================================
const TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00',
];

/**
 * Возвращает занятые слоты для заданной даты.
 * Алгоритм детерминированный — одна и та же дата = одни и те же занятые слоты.
 * В продакшене заменить на запрос к API.
 * @param {string} dateStr — дата в формате YYYY-MM-DD
 * @returns {string[]} — массив занятых слотов, напр. ['10:00', '13:00']
 */
function getOccupiedSlots(dateStr) {
  // Простой хэш строки для псевдослучайности
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) & 0xFFFF;
  }
  // Каждый бит хэша определяет занятость слота
  return TIME_SLOTS.filter((_, i) => (hash >> i) & 1);
}

// ============================================================
// ДЕМО-ЗАПИСИ ПОЛЬЗОВАТЕЛЯ
// В продакшене — загружать из API по Telegram user_id
// ============================================================
const DEMO_APPOINTMENTS = [
  {
    id: 1,
    serviceId: 1,
    // Запись через 3 дня от "сегодня"
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      // Пропускаем воскресенье
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })(),
    time: '15:00',
    status: 'confirmed', // confirmed | pending | cancelled
  },
  {
    id: 2,
    serviceId: 3,
    // Запись 2 недели назад (история)
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return d.toISOString().split('T')[0];
    })(),
    time: '12:00',
    status: 'confirmed',
  },
];

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ УТИЛИТЫ ДЛЯ ДАТ
// ============================================================

/** Форматировать дату YYYY-MM-DD → '14 апреля 2026, пятница' */
function formatDateLong(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}

/** Форматировать дату YYYY-MM-DD → '14 апр' */
function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Форматировать дату YYYY-MM-DD → '14 апреля' */
function formatDateMedium(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/** Форматировать длительность 60 → '1 ч', 90 → '1 ч 30 мин', 45 → '45 мин' */
function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/** Форматировать цену 2500 → '2 500 ₽' */
function formatPrice(price) {
  return price.toLocaleString('ru-RU') + ' ₽';
}

/** Найти услугу по id */
function getServiceById(id) {
  return SERVICES.find(s => s.id === id);
}

// ============================================================
// ГАЛЕРЕЯ — отдельный массив фото для экрана «Мои работы»
// Каждый элемент: { url, category }
// Заменить URL на реальные фото мастера
// ============================================================
const GALLERY_PHOTOS = [
  // Маникюр
  { url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&auto=format&q=75', category: 'Маникюр' },
  { url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&h=400&fit=crop&auto=format&q=75', category: 'Маникюр' },
  { url: 'https://images.unsplash.com/photo-1604902396830-aca55e311b54?w=400&h=400&fit=crop&auto=format&q=75', category: 'Маникюр' },
  { url: 'https://images.unsplash.com/photo-1515688594390-b649af70d282?w=400&h=400&fit=crop&auto=format&q=75', category: 'Маникюр' },
  // Педикюр
  { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop&auto=format&q=75', category: 'Педикюр' },
  { url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&h=400&fit=crop&auto=format&q=75', category: 'Педикюр' },
  { url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400&h=400&fit=crop&auto=format&q=75', category: 'Педикюр' },
  // Наращивание
  { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop&auto=format&q=75', category: 'Наращивание' },
  { url: 'https://images.unsplash.com/photo-1604654894640-3d8aba1bd6b5?w=400&h=400&fit=crop&auto=format&q=75', category: 'Наращивание' },
  // Дизайн
  { url: 'https://images.unsplash.com/photo-1604654894619-3d8aba1bd6b5?w=400&h=400&fit=crop&auto=format&q=75', category: 'Дизайн' },
  { url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=401&fit=crop&auto=format&q=75', category: 'Дизайн' },
  { url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&h=401&fit=crop&auto=format&q=75', category: 'Дизайн' },
];
