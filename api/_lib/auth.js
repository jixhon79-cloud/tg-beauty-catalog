import crypto from 'crypto';

/**
 * Проверяет Telegram initData и возвращает данные пользователя.
 * Если BOT_TOKEN не задан или DEV_MODE=true — возвращает тестового пользователя.
 *
 * @param {string} initData — строка из window.Telegram.WebApp.initData
 * @returns {{ id: number, first_name: string, last_name?: string, username?: string }}
 * @throws {Error} если подпись невалидна
 */
export function verifyTelegramInitData(initData) {
  // Dev-режим: если нет initData и стоит флаг DEV_MODE
  if (!initData && process.env.DEV_MODE === 'true') {
    return { id: 123456789, first_name: 'Dev', last_name: 'User', username: 'devuser' };
  }

  if (!initData) {
    throw new Error('auth_failed: no initData');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');

  if (!receivedHash) {
    throw new Error('auth_failed: no hash');
  }

  // Собираем строку для проверки: все поля кроме hash, отсортированные по ключу
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) throw new Error('auth_failed: BOT_TOKEN not set');

  // HMAC-SHA256
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (expectedHash !== receivedHash) {
    throw new Error('auth_failed: invalid signature');
  }

  // Проверяем свежесть данных (не старше 1 часа)
  const authDate = Number(params.get('auth_date'));
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > 3600) {
    throw new Error('auth_failed: initData expired');
  }

  const user = JSON.parse(params.get('user') || '{}');
  if (!user.id) throw new Error('auth_failed: no user in initData');

  return user;
}

/**
 * Хелпер для Vercel-функций: читает initData из заголовка и проверяет.
 * Возвращает объект пользователя или кидает 401.
 */
export function requireAuth(req, res) {
  const initData = req.headers['x-telegram-init-data'] || '';
  try {
    return verifyTelegramInitData(initData);
  } catch (e) {
    res.status(401).json({ error: 'auth_failed', message: e.message });
    return null;
  }
}
