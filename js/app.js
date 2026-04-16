/**
 * app.js — вся логика приложения
 *
 * Структура:
 * 1. Инициализация Telegram SDK
 * 2. Состояние приложения
 * 3. Навигация
 * 4. Рендер экранов
 * 5. Обработка событий (делегирование)
 * 6. Запуск
 */

// ============================================================
// 1. TELEGRAM SDK
// В Telegram работает нативно. В браузере — заглушка для разработки.
// ============================================================

const tg = window.Telegram?.WebApp || null;

// Инициализация SDK
if (tg) {
  tg.ready();
  tg.expand(); // Развернуть Mini App на полную высоту
}

// Получить имя пользователя из Telegram (или fallback)
function getTelegramUserName() {
  if (!tg) return 'Пользователь';
  const user = tg.initDataUnsafe?.user;
  if (!user) return 'Пользователь';
  return user.first_name + (user.last_name ? ' ' + user.last_name : '');
}

// Обёртки над Telegram API — безопасные вызовы
const Haptic = {
  success: () => tg?.HapticFeedback?.notificationOccurred('success'),
  error:   () => tg?.HapticFeedback?.notificationOccurred('error'),
  tap:     () => tg?.HapticFeedback?.impactOccurred('light'),
  medium:  () => tg?.HapticFeedback?.impactOccurred('medium'),
};

function tgConfirm(message, callback) {
  if (tg) {
    tg.showConfirm(message, (ok) => { if (ok) callback(); });
  } else {
    // Браузерный fallback для разработки
    if (window.confirm(message)) callback();
  }
}

function tgAlert(message) {
  if (tg) {
    tg.showAlert(message);
  } else {
    window.alert(message);
  }
}

// ============================================================
// 2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================================

const state = {
  screen: 'home',
  screenParams: {},
  // Стек навигации для кнопки «Назад»
  navStack: [{ screen: 'home', params: {} }],
  activeTab: 'home',
  // Активная категория в каталоге
  activeCategory: 'Все',
  // Состояние флоу бронирования
  booking: {
    serviceId: null,
    date: null,
    time: null,
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
  },
  // Записи пользователя — загружаются с сервера
  appointments: [],
  // Занятые слоты для выбранной даты — загружаются с сервера
  occupiedSlots: [],
  // Текущий обработчик MainButton (нужно хранить для отписки)
  mainButtonHandler: null,
};

// ============================================================
// 3. НАВИГАЦИЯ
// ============================================================

/**
 * Перейти на экран.
 * @param {string} screen — имя экрана
 * @param {object} params — параметры (id услуги и т.д.)
 * @param {boolean} replaceStack — если true, не добавлять в стек (для табов)
 */
function navigate(screen, params = {}, replaceStack = false) {
  if (replaceStack) {
    state.navStack = [{ screen, params }];
  } else {
    state.navStack.push({ screen, params });
  }
  state.screen = screen;
  state.screenParams = params;
  renderCurrentScreen();
  updateBackButton();
  // Прокрутить вверх при смене экрана
  window.scrollTo(0, 0);
}

/** Нажатие нативной кнопки «Назад» */
function goBack() {
  if (state.navStack.length > 1) {
    state.navStack.pop();
    const prev = state.navStack[state.navStack.length - 1];
    state.screen = prev.screen;
    state.screenParams = prev.params;
    renderCurrentScreen();
    updateBackButton();
    window.scrollTo(0, 0);
  }
}

/** Переключение вкладки */
function switchTab(tab) {
  state.activeTab = tab;
  // Сбрасываем стек — при переключении таба «назад» не нужен
  navigate(tab, {}, true);
  // Обновить активную вкладку в таб-баре
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.params?.includes(`"tab":"${tab}"`));
  });
}

/** Показать/скрыть кнопку «Назад» Telegram */
function updateBackButton() {
  if (!tg) return;
  if (state.navStack.length > 1) {
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
}

/** Показать/скрыть таб-бар */
function showTabBar(visible) {
  const bar = document.getElementById('tab-bar');
  bar.classList.toggle('hidden', !visible);
}

/** Настроить MainButton */
function setMainButton(text, onClick, enabled = true) {
  if (!tg) return;
  const btn = tg.MainButton;
  // Отписываемся от старого обработчика, чтобы не дублировались
  if (state.mainButtonHandler) {
    btn.offClick(state.mainButtonHandler);
  }
  state.mainButtonHandler = onClick;
  btn.onClick(onClick);
  btn.setText(text);
  if (enabled) {
    btn.enable();
    btn.show();
    btn.hideProgress();
  } else {
    btn.disable();
    btn.show();
  }
}

/** Скрыть MainButton */
function hideMainButton() {
  if (!tg) return;
  if (state.mainButtonHandler) {
    tg.MainButton.offClick(state.mainButtonHandler);
    state.mainButtonHandler = null;
  }
  tg.MainButton.hide();
}

// ============================================================
// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ РЕНДЕРА
// ============================================================

/**
 * HTML кнопки «Назад» для браузера.
 * В Telegram она не нужна — там есть нативная tg.BackButton вверху.
 */
function backBarHtml() {
  if (tg) return ''; // В Telegram — нативная кнопка, не дублируем
  if (state.navStack.length <= 1) return '';
  return `
    <div class="app-back-bar">
      <button class="app-back-btn" data-action="goBack">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Назад
      </button>
    </div>
  `;
}

/** HTML звёздочек рейтинга */
function starsHtml(rating) {
  const full = Math.floor(rating);
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
  return `<span class="rating__stars">${stars}</span>`;
}

/**
 * HTML фото услуги — реальное если есть, иначе градиент-заглушка.
 * @param {object} service — объект услуги
 * @param {number} index — индекс фото в массиве photos (по умолчанию 0)
 * @param {string} size — 'large' для героя, иначе миниатюра
 */
function servicePhotoHtml(service, index = 0, size = 'normal') {
  const photo = service.photos?.[index];
  const fontSize = size === 'large' ? '72px' : '28px';
  const gradient = service.gradient;
  const emoji = service.emoji;

  if (photo) {
    // Реальное фото с градиентом за ним на случай медленной загрузки
    return `
      <div style="background:${gradient}; width:100%; height:100%; position:relative">
        <img
          src="${photo}"
          alt="${service.name}"
          loading="lazy"
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
          onerror="this.remove()"
        >
      </div>
    `;
  }
  // Градиент-заглушка
  return `
    <div class="photo-placeholder" style="background:${gradient}; font-size:${fontSize}">
      ${emoji}
    </div>
  `;
}

/** HTML карточки отзыва */
function reviewCardHtml(review) {
  return `
    <div class="review-card">
      <div class="review-card__header">
        <div class="avatar avatar--sm" style="background:${stringToColor(review.initials)}">
          ${review.initials}
        </div>
        <div class="review-card__meta">
          <div class="review-card__name">${review.name}</div>
          <div class="review-card__date">${review.date}</div>
        </div>
        <div>${starsHtml(review.rating)}</div>
      </div>
      <div class="review-card__text">${review.text}</div>
      ${review.verified ? `
        <div class="review-card__badge">
          <span>✓</span> Верифицированный отзыв
        </div>
      ` : ''}
    </div>
  `;
}

/** Псевдослучайный цвет для аватара по строке инициалов */
function stringToColor(str) {
  const colors = [
    '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#009688', '#4caf50', '#ff5722',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** HTML карточки записи */
function appointmentCardHtml(appt, isPast = false) {
  const service = getServiceById(appt.serviceId);
  if (!service) return '';

  const dateLabel = formatDateMedium(appt.date);
  const statusChip = isPast
    ? `<span class="chip">Завершено</span>`
    : `<span class="chip chip--success">Подтверждено</span>`;

  const actions = isPast
    ? `<button class="btn btn--secondary btn--sm" data-action="repeatBooking" data-params='{"serviceId":${service.id}}'>
         Записаться снова
       </button>`
    : `<button class="btn btn--danger btn--sm" data-action="cancelAppointment" data-params='{"id":${appt.id}}'>
         Отменить
       </button>`;

  return `
    <div class="appointment-card">
      <div class="appointment-card__header">
        <div class="appointment-card__emoji">${service.emoji}</div>
        <div class="appointment-card__info">
          <div class="appointment-card__name">${service.name}</div>
          <div class="appointment-card__datetime">
            📅 ${dateLabel} · ⏰ ${appt.time}
          </div>
        </div>
        <div class="appointment-card__status">${statusChip}</div>
      </div>
      <div class="appointment-card__actions">${actions}</div>
    </div>
  `;
}

// ============================================================
// 5. РЕНДЕР ЭКРАНОВ
// ============================================================

/** Выбрать нужный рендер и показать экран */
function renderCurrentScreen() {
  const { screen, screenParams } = state;
  const app = document.getElementById('app');

  // Таб-бар — показываем только на "корневых" экранах
  const tabScreens = ['home', 'catalog', 'appointments'];
  showTabBar(tabScreens.includes(screen));

  // Онбординг — если первый запуск
  if (needsOnboarding()) {
    app.innerHTML = renderOnboarding();
    showTabBar(false);
    return;
  }

  // Рендерим нужный экран
  switch (screen) {
    case 'home':          app.innerHTML = renderHome(); break;
    case 'catalog':       app.innerHTML = renderCatalog(); break;
    case 'service':       app.innerHTML = renderService(screenParams.id); break;
    case 'booking':       app.innerHTML = renderBooking(screenParams.serviceId); break;
    case 'confirm':       app.innerHTML = renderConfirm(); break;
    case 'success':       app.innerHTML = renderSuccess(); break;
    case 'gallery':       app.innerHTML = renderGallery(); break;
    case 'reviews':       app.innerHTML = renderReviews(); break;
    case 'appointments':  app.innerHTML = renderAppointments(); break;
    default:              app.innerHTML = renderHome();
  }
}

// ---------------------------
// ЭКРАН: ГЛАВНАЯ
// ---------------------------
function renderHome() {
  // Настраиваем кнопку
  setMainButton('Записаться', () => navigate('catalog'));

  // Берём первые 3 работы из разных услуг для галереи
  const galleryItems = SERVICES.slice(0, 3);

  return `
    <div class="screen">

      <!-- Профиль мастера -->
      <div class="home-hero">
        <div class="avatar">
          ${MASTER.photo
            ? `<img src="${MASTER.photo}" alt="${MASTER.name}">`
            : MASTER.initials
          }
        </div>
        <div class="home-hero__name">${MASTER.name}</div>
        <div class="home-hero__title">${MASTER.title}</div>
        <div class="home-hero__tagline">«${MASTER.tagline}»</div>
      </div>

      <!-- Статистика -->
      <div class="home-stats">
        <div class="home-stat">
          <div class="home-stat__value">${MASTER.rating}</div>
          <div class="home-stat__label">рейтинг</div>
        </div>
        <div class="home-stat">
          <div class="home-stat__value">${MASTER.worksCount}</div>
          <div class="home-stat__label">работ</div>
        </div>
        <div class="home-stat">
          <div class="home-stat__value">${MASTER.clientsCount}</div>
          <div class="home-stat__label">клиентов</div>
        </div>
      </div>

      <!-- Работы мастера -->
      <div class="section">
        <div class="section-header">
          <div class="section-title">Мои работы</div>
          <button class="section-link" data-action="navigate" data-params='{"screen":"gallery"}'>
            Все работы →
          </button>
        </div>
        <div class="gallery-strip">
          ${galleryItems.map((s, i) => `
            <div class="gallery-strip__item" data-action="navigate" data-params='{"screen":"gallery"}'>
              <div class="gallery-strip__photo" style="background:${s.gradient}; position:relative; overflow:hidden">
                ${s.photos?.[0]
                  ? `<img src="${s.photos[0]}" alt="${s.name}" loading="lazy"
                       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
                       onerror="this.remove()">`
                  : s.emoji
                }
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Последний отзыв -->
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            ${starsHtml(MASTER.rating)}
            <span class="rating__value" style="margin-left:6px">${MASTER.rating}</span>
          </div>
          <button class="section-link" data-action="navigate" data-params='{"screen":"reviews"}'>
            Все отзывы →
          </button>
        </div>
        ${reviewCardHtml(REVIEWS[0])}
      </div>

      <!-- Поделиться -->
      <div class="section">
        <button class="share-btn" data-action="shareBot">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
          </svg>
          Поделиться с подругой
        </button>
      </div>

      <!-- Адрес -->
      <div class="section">
        <div class="address-card"
          data-action="openMap">
          <div class="address-card__icon">📍</div>
          <div class="address-card__text">
            <div class="address-card__main">${MASTER.address}</div>
            <div class="address-card__sub">${MASTER.metro} · ${MASTER.workingHours}</div>
          </div>
          <svg class="address-card__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>

    </div>
  `;
}

// ---------------------------
// ЭКРАН: КАТАЛОГ УСЛУГ
// ---------------------------
function renderCatalog() {
  hideMainButton();

  const filtered = state.activeCategory === 'Все'
    ? SERVICES
    : SERVICES.filter(s => s.category === state.activeCategory);

  return `
    <div class="screen">
      <div class="page-header">
        <div class="page-title">Услуги</div>
        <div class="page-subtitle">${MASTER.experience} · ${MASTER.workingHours}</div>
      </div>

      <!-- Фильтр по категориям -->
      <div class="categories">
        ${CATEGORIES.map(cat => `
          <button class="category-btn ${cat === state.activeCategory ? 'active' : ''}"
            data-action="selectCategory"
            data-params='{"category":"${cat}"}'>
            ${cat}
          </button>
        `).join('')}
      </div>

      <!-- Список услуг -->
      <div class="catalog-list">
        ${filtered.length === 0
          ? `<div class="empty-state">
               <div class="empty-state__icon">🔍</div>
               <div class="empty-state__title">Услуг не найдено</div>
               <div class="empty-state__text">В этой категории пока нет услуг</div>
             </div>`
          : filtered.map(service => `
            <div class="service-card"
              data-action="navigate"
              data-params='{"screen":"service","id":${service.id}}'>
              <!-- Фото в карточке каталога -->
              <div class="service-card__photo" style="background:${service.gradient}; position:relative; overflow:hidden">
                ${service.photos?.[0]
                  ? `<img src="${service.photos[0]}" alt="${service.name}" loading="lazy"
                       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
                       onerror="this.remove()">`
                  : `<span>${service.emoji}</span>`
                }
              </div>
              <div class="service-card__body">
                <div class="service-card__name">${service.name}</div>
                <div class="service-card__desc">${service.shortDesc}</div>
                <div class="service-card__meta">
                  <span class="chip">⏱ ${formatDuration(service.duration)}</span>
                  <span class="chip chip--accent">${formatPrice(service.price)}</span>
                  ${service.popular ? '<span class="chip chip--popular">★ Топ</span>' : ''}
                </div>
              </div>
              <svg class="service-card__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          `).join('')}
      </div>

    </div>
  `;
}

// ---------------------------
// ЭКРАН: КАРТОЧКА УСЛУГИ
// ---------------------------
function renderService(id) {
  const service = getServiceById(id);
  if (!service) { navigate('catalog'); return ''; }

  setMainButton('Записаться', () => {
    state.booking = {
      serviceId: id,
      date: null,
      time: null,
      calendarMonth: new Date().getMonth(),
      calendarYear: new Date().getFullYear(),
    };
    navigate('booking', { serviceId: id });
  });

  // Ближайший доступный слот
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1); // пропустить воскресенье
  const nextSlot = '10:00';
  const tomorrowLabel = tomorrow.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  // Количество фото-заглушек
  const photoCount = service.photosCount;

  return `
    <div class="screen screen--flow service-detail">
      ${backBarHtml()}

      <!-- Фото услуги (крупное) — реальное если есть, иначе градиент -->
      <div class="service-gallery">
        <div class="service-gallery__main" style="background:${service.gradient}; overflow:hidden">
          ${service.photos?.[0]
            ? `<img
                 src="${service.photos[0]}"
                 alt="${service.name}"
                 style="width:100%;height:100%;object-fit:cover;display:block"
                 onerror="this.style.display='none'"
               >`
            : `<div class="photo-placeholder" style="font-size:80px">${service.emoji}</div>`
          }
        </div>
        <!-- Точки: сколько фото есть у услуги -->
        <div class="service-gallery__thumbs">
          ${Array.from({length: Math.min(photoCount, 5)}, (_, i) =>
            `<div class="gallery-dot ${i === 0 ? 'active' : ''}"></div>`
          ).join('')}
        </div>
      </div>

      <!-- Информация об услуге -->
      <div class="service-info">
        <div class="service-info__name">${service.name}</div>
        <div class="service-info__desc">${service.description}</div>

        <!-- Длительность и цена -->
        <div class="service-info__chips">
          <span class="chip" style="font-size:15px; padding:6px 14px">
            ⏱ ${formatDuration(service.duration)}
          </span>
          <span class="chip chip--accent" style="font-size:15px; padding:6px 14px; font-weight:700">
            ${formatPrice(service.price)}
          </span>
          ${service.popular ? '<span class="chip chip--popular">★ Популярная услуга</span>' : ''}
        </div>

        <!-- Ближайший слот -->
        <div class="service-info__next">
          <span>📅</span>
          Ближайшая запись: <strong>${tomorrowLabel}, ${nextSlot}</strong>
        </div>
      </div>

    </div>
  `;
}

// ---------------------------
// ЭКРАН: ВЫБОР ДАТЫ И ВРЕМЕНИ
// ---------------------------
function renderBooking(serviceId) {
  const service = getServiceById(serviceId || state.booking.serviceId);
  if (!service) { navigate('catalog'); return ''; }

  const { date, time, calendarMonth, calendarYear } = state.booking;

  // Кнопка активна только если выбрали дату и время
  if (date && time) {
    setMainButton('Далее →', () => navigate('confirm'));
  } else {
    setMainButton('Выберите дату и время', () => {}, false);
  }

  return `
    <div class="screen screen--flow">
      ${backBarHtml()}

      <!-- Индикатор шага -->
      <div class="step-indicator">
        <div class="step-dot active"></div>
        <div class="step-dot ${date && time ? 'done' : ''}"></div>
      </div>

      <!-- Выбранная услуга -->
      <div class="booking-service-summary">
        <div class="booking-service-summary__emoji">${service.emoji}</div>
        <div>
          <div class="booking-service-summary__name">${service.name}</div>
          <div class="booking-service-summary__meta">${formatDuration(service.duration)} · ${formatPrice(service.price)}</div>
        </div>
      </div>

      <!-- Календарь -->
      <div class="booking-section-title">Выберите дату</div>
      <div class="calendar">
        ${renderCalendar(calendarYear, calendarMonth)}
      </div>

      <!-- Слоты времени (показываем только если дата выбрана) -->
      ${date ? `
        <div class="booking-section-title">Выберите время</div>
        <div class="time-slots">
          <div class="time-slots__grid">
            ${renderTimeSlots(date)}
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

/** HTML календаря на месяц */
function renderCalendar(year, month) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Название месяца
  const monthName = firstDay.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  // День недели первого числа (0=Пн ... 6=Вс в русской раскладке)
  const startDow = (firstDay.getDay() + 6) % 7;

  // Заблокировать кнопку "назад" если мы в текущем месяце
  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth();

  // Ячейки
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push('<div class="calendar__day calendar__day--empty"></div>');

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split('T')[0];
    const dow = (date.getDay() + 6) % 7; // 6 = воскресенье

    const isPast = date < today;
    const isSunday = dow === 6;
    const isToday = date.getTime() === today.getTime();
    const isSelected = dateStr === state.booking.date;
    const isDisabled = isPast || isSunday;

    let cls = 'calendar__day';
    if (isPast || isSunday) cls += ' calendar__day--past';
    if (isSunday && !isPast) cls += ' calendar__day--sunday';
    if (isToday) cls += ' calendar__day--today';
    if (isSelected) cls += ' calendar__day--selected';

    if (isDisabled) {
      cells.push(`<div class="${cls}">${d}</div>`);
    } else {
      cells.push(`
        <div class="${cls}" role="button"
          data-action="selectDate"
          data-params='{"date":"${dateStr}"}'>
          ${d}
        </div>
      `);
    }
  }

  return `
    <div class="calendar__nav">
      <button class="calendar__nav-btn"
        data-action="prevMonth"
        ${isPrevDisabled ? 'disabled' : ''}>‹</button>
      <div class="calendar__month">${monthName}</div>
      <button class="calendar__nav-btn" data-action="nextMonth">›</button>
    </div>
    <div class="calendar__weekdays">
      <div class="calendar__weekday">Пн</div>
      <div class="calendar__weekday">Вт</div>
      <div class="calendar__weekday">Ср</div>
      <div class="calendar__weekday">Чт</div>
      <div class="calendar__weekday">Пт</div>
      <div class="calendar__weekday">Сб</div>
      <div class="calendar__weekday" style="color:#f44336">Вс</div>
    </div>
    <div class="calendar__grid">
      ${cells.join('')}
    </div>
  `;
}

/** HTML слотов времени для выбранной даты */
function renderTimeSlots(dateStr) {
  const occupied = state.occupiedSlots;
  return TIME_SLOTS.map(slot => {
    const isOccupied = occupied.includes(slot);
    const isSelected = slot === state.booking.time;
    let cls = 'time-slot';
    if (isOccupied) cls += ' time-slot--occupied';
    if (isSelected) cls += ' time-slot--selected';
    return `
      <div class="${cls}"
        ${!isOccupied ? `data-action="selectTime" data-params='{"time":"${slot}"}'` : ''}>
        ${slot}
      </div>
    `;
  }).join('');
}

// ---------------------------
// ЭКРАН: ПОДТВЕРЖДЕНИЕ
// ---------------------------
function renderConfirm() {
  const { serviceId, date, time } = state.booking;
  const service = getServiceById(serviceId);
  if (!service || !date || !time) { navigate('catalog'); return ''; }

  const userName = getTelegramUserName();
  const dateLabel = formatDateLong(date);

  setMainButton('Подтвердить запись', () => confirmBooking());

  return `
    <div class="screen screen--flow">
      ${backBarHtml()}

      <!-- Индикатор шага -->
      <div class="step-indicator">
        <div class="step-dot done"></div>
        <div class="step-dot active"></div>
      </div>

      <div class="page-header">
        <div class="page-title">Проверьте запись</div>
        <div class="page-subtitle">Всё верно? Нажмите «Подтвердить»</div>
      </div>

      <!-- Карточка с деталями -->
      <div class="confirm-card">
        <div class="confirm-row">
          <div class="confirm-row__icon">${service.emoji}</div>
          <div>
            <div class="confirm-row__label">Услуга</div>
            <div class="confirm-row__value">${service.name}</div>
          </div>
        </div>
        <div class="divider" style="margin:0"></div>
        <div class="confirm-row">
          <div class="confirm-row__icon">📅</div>
          <div>
            <div class="confirm-row__label">Дата</div>
            <div class="confirm-row__value">${dateLabel}</div>
          </div>
        </div>
        <div class="confirm-row">
          <div class="confirm-row__icon">⏰</div>
          <div>
            <div class="confirm-row__label">Время</div>
            <div class="confirm-row__value">${time} · ${formatDuration(service.duration)}</div>
          </div>
        </div>
        <div class="divider" style="margin:0"></div>
        <div class="confirm-row">
          <div class="confirm-row__icon">💰</div>
          <div>
            <div class="confirm-row__label">Стоимость</div>
            <div class="confirm-row__value confirm-row__value--price">${formatPrice(service.price)}</div>
          </div>
        </div>
      </div>

      <!-- Данные пользователя -->
      <div class="confirm-user">
        <div class="confirm-user__icon">👤</div>
        <div>
          <div class="confirm-user__label">Клиент</div>
          <div class="confirm-user__name">${userName}</div>
        </div>
      </div>

      <!-- Политика отмены -->
      <div class="confirm-policy">
        <div class="confirm-policy__icon">ℹ️</div>
        <div>Отмена бесплатна за 24 часа до визита. После — взимается 50% стоимости услуги.</div>
      </div>

    </div>
  `;
}

/** Обработать нажатие «Подтвердить» */
function confirmBooking() {
  if (tg) {
    tg.MainButton.disable();
    tg.MainButton.showProgress(false);
  }

  const initData = tg?.initData || '';

  fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
    },
    body: JSON.stringify({
      service_id: state.booking.serviceId,
      date: state.booking.date,
      time: state.booking.time,
    }),
  })
    .then(r => r.json())
    .then(data => {
      if (tg) {
        tg.MainButton.hideProgress();
        tg.MainButton.enable();
      }
      if (data.error === 'slot_taken') {
        tgAlert('Этот слот только что заняли. Выберите другое время.');
        state.booking.time = null;
        state.occupiedSlots = [];
        navigate('booking', { serviceId: state.booking.serviceId });
        return;
      }
      if (data.error) {
        tgAlert('Что-то пошло не так. Попробуйте ещё раз.');
        return;
      }
      // Успех — сохраняем id записи и переходим на экран успеха
      state.lastBookingId = data.id;
      Haptic.success();
      navigate('success', {}, true);
    })
    .catch(() => {
      if (tg) { tg.MainButton.hideProgress(); tg.MainButton.enable(); }
      tgAlert('Нет соединения. Проверьте интернет и попробуйте снова.');
    });
}

// ---------------------------
// ЭКРАН: УСПЕХ
// ---------------------------
function renderSuccess() {
  const { serviceId, date, time } = state.booking;
  const service = getServiceById(serviceId);

  setMainButton('На главную', () => {
    state.booking = {
      serviceId: null, date: null, time: null,
      calendarMonth: new Date().getMonth(),
      calendarYear: new Date().getFullYear(),
    };
    navigate('home', {}, true);
    switchTab('home');
  });

  // После успеха кнопку «Назад» скрываем принудительно
  if (tg) tg.BackButton.hide();

  return `
    <div class="screen success-screen">

      <!-- Анимированная галочка -->
      <svg class="success-icon" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="23"/>
        <path d="M14 27 L22 35 L38 19"/>
      </svg>

      <div class="success-title">Вы записаны! 🎉</div>

      ${service && date && time ? `
        <div class="success-details">
          <div class="success-details__item">
            <span>${service.emoji}</span>
            <strong>${service.name}</strong>
          </div>
          <div class="success-details__item">
            <span>📅</span>
            <strong>${formatDateMedium(date)}, ${time}</strong>
          </div>
          <div class="success-details__item">
            <span>💰</span>
            <strong>${formatPrice(service.price)}</strong>
          </div>
          <div class="success-details__item">
            <span>📍</span>
            <strong>${MASTER.address}</strong>
          </div>
        </div>
      ` : ''}

      <div class="success-reminder">
        <span>🔔</span>
        Напоминание придёт в Telegram за 2 часа
      </div>

    </div>
  `;
}

// ---------------------------
// ЭКРАН: ГАЛЕРЕЯ РАБОТ
// ---------------------------
function renderGallery() {
  hideMainButton();

  // Берём фото из GALLERY_PHOTOS, фильтруем по категории
  const filtered = state.activeCategory === 'Все'
    ? GALLERY_PHOTOS
    : GALLERY_PHOTOS.filter(p => p.category === state.activeCategory);

  return `
    <div class="screen">
      ${backBarHtml()}
      <div class="page-header">
        <div class="page-title">Мои работы</div>
        <div class="page-subtitle">${MASTER.worksCount} фотографий</div>
      </div>

      <!-- Категории -->
      <div class="categories">
        ${CATEGORIES.map(cat => `
          <button class="category-btn ${cat === state.activeCategory ? 'active' : ''}"
            data-action="selectCategory"
            data-params='{"category":"${cat}"}'>
            ${cat}
          </button>
        `).join('')}
      </div>

      <!-- Сетка фото — используем GALLERY_PHOTOS -->
      <div class="gallery-grid">
        ${filtered.map(item => `
          <div class="gallery-grid__item">
            <div class="gallery-grid__photo"
              style="background:var(--card-bg); position:relative; overflow:hidden">
              <img
                src="${item.url}"
                alt="${item.category}"
                loading="lazy"
                style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
                onerror="this.parentElement.innerHTML='<span style=font-size:28px>${
                  CATEGORIES.indexOf(item.category) >= 0
                    ? SERVICES.find(s => s.category === item.category)?.emoji || '💅'
                    : '💅'
                }</span>'"
              >
            </div>
          </div>
        `).join('')}
      </div>

    </div>
  `;
}

// ---------------------------
// ЭКРАН: ОТЗЫВЫ
// ---------------------------
function renderReviews() {
  hideMainButton();

  return `
    <div class="screen">
      ${backBarHtml()}
      <div class="page-header">
        <div class="page-title">Отзывы</div>
      </div>

      <!-- Общий рейтинг -->
      <div class="section">
        <div class="card" style="padding:var(--gap-md); display:flex; align-items:center; gap:var(--gap-md);">
          <div style="font-size:40px; font-weight:800; line-height:1">${MASTER.rating}</div>
          <div>
            ${starsHtml(MASTER.rating)}
            <div style="font-size:var(--font-xs); color:var(--hint); margin-top:4px">
              ${MASTER.reviewsCount} отзывов · все подтверждённые клиенты
            </div>
          </div>
        </div>
      </div>

      <!-- Список отзывов -->
      <div class="section" style="display:flex; flex-direction:column; gap:10px">
        ${REVIEWS.length === 0
          ? `<div class="empty-state">
               <div class="empty-state__icon">💬</div>
               <div class="empty-state__title">Отзывов пока нет</div>
               <div class="empty-state__text">Станьте первым клиентом и оставьте отзыв после визита</div>
             </div>`
          : REVIEWS.map(r => reviewCardHtml(r)).join('')}
      </div>

    </div>
  `;
}

// ---------------------------
// ЭКРАН: МОИ ЗАПИСИ
// ---------------------------
function renderAppointments() {
  hideMainButton();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = state.appointments.filter(a => {
    const d = new Date(a.date + 'T00:00:00');
    return d >= now && a.status !== 'cancelled';
  });

  const past = state.appointments.filter(a => {
    const d = new Date(a.date + 'T00:00:00');
    return d < now || a.status === 'cancelled';
  });

  return `
    <div class="screen">
      <div class="page-header">
        <div class="page-title">Мои записи</div>
      </div>

      <!-- Предстоящие -->
      <div class="appointments-section">
        <div class="appointments-section-title">Предстоящие</div>
        ${upcoming.length === 0
          ? `<div class="empty-state" style="padding:24px var(--gap-md)">
               <div class="empty-state__icon">📅</div>
               <div class="empty-state__title">Записей нет</div>
               <div class="empty-state__text">Самое время записаться!</div>
               <button class="btn btn--primary" style="margin-top:8px; max-width:200px"
                 data-action="switchTab" data-params='{"tab":"catalog"}'>
                 Выбрать услугу
               </button>
             </div>`
          : upcoming.map(a => appointmentCardHtml(a, false)).join('')}
      </div>

      <!-- История -->
      ${past.length > 0 ? `
        <div class="appointments-section">
          <div class="appointments-section-title">История</div>
          ${past.map(a => appointmentCardHtml(a, true)).join('')}
        </div>
      ` : ''}

    </div>
  `;
}

// ============================================================
// 6. ОБРАБОТКА СОБЫТИЙ
// Используем делегирование — один обработчик на весь #app
// ============================================================

document.addEventListener('click', (e) => {
  // Ищем ближайший элемент с data-action
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  let params = {};
  try {
    params = JSON.parse(target.dataset.params || '{}');
  } catch (_) {}

  Haptic.tap();

  switch (action) {

    case 'goBack':
      goBack();
      break;

    case 'navigate':
      navigate(params.screen, params);
      break;

    case 'switchTab':
      switchTab(params.tab);
      break;

    case 'selectCategory':
      state.activeCategory = params.category;
      renderCurrentScreen();
      break;

    case 'selectDate':
      state.booking.date = params.date;
      state.booking.time = null;
      state.occupiedSlots = [];
      renderCurrentScreen();
      // Загружаем занятые слоты с сервера
      fetch(`/api/slots?date=${params.date}`)
        .then(r => r.json())
        .then(data => {
          state.occupiedSlots = data.occupied || [];
          renderCurrentScreen();
        })
        .catch(() => {}); // при ошибке слоты остаются пустыми
      break;

    case 'selectTime':
      state.booking.time = params.time;
      renderCurrentScreen();
      // После выбора времени — активируем MainButton
      setMainButton('Далее →', () => navigate('confirm'));
      Haptic.medium();
      break;

    case 'prevMonth':
      state.booking.calendarMonth--;
      if (state.booking.calendarMonth < 0) {
        state.booking.calendarMonth = 11;
        state.booking.calendarYear--;
      }
      renderCurrentScreen();
      break;

    case 'nextMonth':
      state.booking.calendarMonth++;
      if (state.booking.calendarMonth > 11) {
        state.booking.calendarMonth = 0;
        state.booking.calendarYear++;
      }
      renderCurrentScreen();
      break;

    case 'shareBot': {
      Haptic.medium();
      const shareText = encodeURIComponent('Записывайся к мастеру маникюра и педикюра прямо в Telegram 💅');
      const shareUrl = `https://t.me/share/url?url=https%3A%2F%2Ft.me%2Ftg_beauty_catalog_bot&text=${shareText}`;
      if (tg) {
        tg.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
      break;
    }

    case 'openMap':
      if (tg) {
        tg.openLink(MASTER.mapUrl);
      } else {
        window.open(MASTER.mapUrl, '_blank');
      }
      break;

    case 'cancelAppointment':
      tgConfirm('Отменить запись? Это действие нельзя отменить.', () => {
        const initData = tg?.initData || '';
        fetch(`/api/bookings/${params.id}`, {
          method: 'DELETE',
          headers: { 'X-Telegram-Init-Data': initData },
        })
          .then(r => r.json())
          .then(data => {
            if (data.error) { tgAlert('Не удалось отменить запись.'); return; }
            // Обновляем локальный список
            state.appointments = state.appointments.map(a =>
              a.id === params.id ? { ...a, status: 'cancelled' } : a
            );
            Haptic.medium();
            renderCurrentScreen();
          })
          .catch(() => tgAlert('Нет соединения.'));
      });
      break;

    case 'finishOnboarding':
      localStorage.setItem(ONBOARDING_KEY, '1');
      Haptic.medium();
      renderCurrentScreen();
      // Оффер показываем сразу после онбординга
      setTimeout(() => initOffer(), 400);
      break;

    case 'repeatBooking':
      // Повторная запись — сразу открываем бронирование с той же услугой
      state.booking = {
        serviceId: params.serviceId,
        date: null,
        time: null,
        calendarMonth: new Date().getMonth(),
        calendarYear: new Date().getFullYear(),
      };
      navigate('booking', { serviceId: params.serviceId });
      break;
  }
});

// Таб-бар — отдельный обработчик (он вне #app)
document.getElementById('tab-bar').addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  let params = {};
  try { params = JSON.parse(target.dataset.params || '{}'); } catch (_) {}
  if (action === 'switchTab') switchTab(params.tab);
});

// Кнопка «Назад» Telegram
if (tg) {
  tg.BackButton.onClick(goBack);
}

// ============================================================
// 7. ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================================

// ============================================================
// 8. ОНБОРДИНГ (первый запуск — до основного экрана)
// ============================================================

const ONBOARDING_KEY = 'beauty_onboarding_done';

function needsOnboarding() {
  return !localStorage.getItem(ONBOARDING_KEY);
}

function renderOnboarding() {
  hideMainButton();

  const userName = getTelegramUserName();
  const firstName = userName.split(' ')[0];

  return `
    <div class="screen onboarding-screen">
      <div class="onboarding-emoji">💅</div>

      <div class="onboarding-title">
        ${firstName !== 'Пользователь' ? `${firstName}, привет!` : 'Привет!'}
      </div>
      <div class="onboarding-subtitle">
        Это личный кабинет мастера маникюра и педикюра Анны Соколовой
      </div>

      <div class="onboarding-features">
        <div class="onboarding-feature">
          <span class="onboarding-feature__icon">🖼</span>
          <span>Смотри работы и выбирай стиль</span>
        </div>
        <div class="onboarding-feature">
          <span class="onboarding-feature__icon">📅</span>
          <span>Записывайся онлайн — без звонков</span>
        </div>
        <div class="onboarding-feature">
          <span class="onboarding-feature__icon">🔔</span>
          <span>Получай напоминания прямо в Telegram</span>
        </div>
      </div>

      <button class="onboarding-btn" data-action="finishOnboarding">
        Начать
      </button>
    </div>
  `;
}

// ============================================================
// 8б. ОФФЕР-МОДАЛКА (первый запуск)
// ============================================================

const OFFER_KEY = 'beauty_offer_shown';
// Ссылка на бота — замени @your_bot_username на реальный username
const BOT_URL = 'https://t.me/tg_beauty_catalog_bot?start=from_app';

function initOffer() {
  const alreadyShown = localStorage.getItem(OFFER_KEY);
  if (alreadyShown) return;

  const overlay = document.getElementById('offer-overlay');
  const cta     = document.getElementById('offer-cta');
  const skip    = document.getElementById('offer-skip');

  // Подставляем ссылку на бота
  cta.href = BOT_URL;

  // Показываем с небольшой задержкой — пусть основной экран успеет отрисоваться
  setTimeout(() => {
    overlay.classList.remove('hidden');
  }, 600);

  function closeOffer() {
    overlay.classList.add('hidden');
    localStorage.setItem(OFFER_KEY, '1');
  }

  // «Получить скидку» — открываем бота и закрываем оффер
  cta.addEventListener('click', () => {
    Haptic.medium();
    // Небольшая пауза чтобы ссылка успела открыться
    setTimeout(closeOffer, 300);
  });

  // «Пропустить»
  skip.addEventListener('click', () => {
    Haptic.tap();
    closeOffer();
  });

  // Тап по фону за карточкой закрывает оффер
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      Haptic.tap();
      closeOffer();
    }
  });
}

// ============================================================
// 9. ЗАПУСК
// ============================================================

function init() {
  // Устанавливаем высоту через Telegram SDK если доступен
  if (tg) {
    const setHeight = () => {
      document.getElementById('app').style.minHeight = tg.viewportStableHeight + 'px';
    };
    tg.onEvent('viewportChanged', setHeight);
    setHeight();
  }

  // Рендерим первый экран
  renderCurrentScreen();

  // Загружаем записи пользователя с сервера
  const initData = tg?.initData || '';
  if (initData) {
    fetch('/api/bookings', {
      headers: { 'X-Telegram-Init-Data': initData },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          state.appointments = data.map(b => ({
            id: b.id,
            serviceId: b.services?.id,
            serviceName: b.services?.name,
            date: b.date,
            time: b.time.slice(0, 5),
            status: b.status,
          }));
          renderCurrentScreen();
        }
      })
      .catch(() => {});
  }

  // Показываем оффер при первом открытии
  initOffer();
}

init();
