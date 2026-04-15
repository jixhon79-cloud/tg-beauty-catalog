/**
 * notify.js — отправка Telegram-уведомлений через бота
 * Использует Bot API sendMessage.
 * Ошибки не бросают исключение — запись сохраняется даже если бот заблокирован.
 */

const TG_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  try {
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error(`[notify] sendMessage failed for ${chatId}:`, err.description);
    }
  } catch (e) {
    // Сеть недоступна или бот заблокирован — логируем и идём дальше
    console.error(`[notify] sendMessage error for ${chatId}:`, e.message);
  }
}

/**
 * Уведомление при создании записи
 */
export async function notifyBookingCreated({ tgUserId, clientName, serviceName, date, time, address }) {
  const dateFormatted = formatDate(date);
  const text =
    `✅ <b>Запись подтверждена!</b>\n\n` +
    `👤 ${clientName}\n` +
    `💅 ${serviceName}\n` +
    `📅 ${dateFormatted}, ${time}\n` +
    `📍 ${address}\n\n` +
    `Если планы изменятся — отмените запись в боте.`;

  await sendMessage(tgUserId, text);
}

/**
 * Уведомление при отмене записи
 */
export async function notifyBookingCancelled({ tgUserId, serviceName, date, time }) {
  const dateFormatted = formatDate(date);
  const text =
    `❌ <b>Запись отменена</b>\n\n` +
    `${serviceName}, ${dateFormatted} в ${time}\n\n` +
    `Хотите записаться на другое время? Откройте бота.`;

  await sendMessage(tgUserId, text);
}

/**
 * Напоминание (за 24ч или за 2ч)
 */
export async function notifyReminder({ tgUserId, serviceName, date, time, address, hoursLeft }) {
  const dateFormatted = formatDate(date);
  const when = hoursLeft >= 20 ? `завтра в ${time}` : `сегодня в ${time}`;
  const icon = hoursLeft >= 20 ? '⏰' : '📍';

  const text =
    `${icon} <b>Напоминание о записи</b>\n\n` +
    `${serviceName}\n` +
    `${dateFormatted}, ${when}\n` +
    `📍 ${address}`;

  await sendMessage(tgUserId, text);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}
