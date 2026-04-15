import { supabase } from '../_lib/supabase.js';
import { notifyReminder } from '../_lib/notify.js';

/**
 * GET /api/cron/reminders
 * Vercel Cron Job — запускать каждый час.
 * Ищет записи через ~24ч и ~2ч и отправляет напоминания.
 *
 * Настройка в vercel.json:
 * "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }]
 */
export default async function handler(req, res) {
  // Защита: только Vercel cron или явный секрет
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const masterId = process.env.MASTER_ID || '1';
  const now = new Date();

  const results = { sent: 0, errors: 0 };

  // Загружаем профиль мастера для адреса
  const { data: master } = await supabase
    .from('masters')
    .select('address')
    .eq('id', masterId)
    .single();

  const address = master?.address || '';

  // Ищем записи в окнах ±30 мин от 24ч и 2ч
  for (const { hoursLeft, windowMin, windowMax } of [
    { hoursLeft: 24, windowMin: 23.5 * 60, windowMax: 24.5 * 60 },
    { hoursLeft: 2,  windowMin: 1.5 * 60,  windowMax: 2.5 * 60 },
  ]) {
    const fromDate = new Date(now.getTime() + windowMin * 60 * 1000);
    const toDate   = new Date(now.getTime() + windowMax * 60 * 1000);

    // Диапазон дат и времён
    const fromDateStr = fromDate.toISOString().slice(0, 10);
    const toDateStr   = toDate.toISOString().slice(0, 10);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, tg_user_id, date, time, services(name)')
      .eq('master_id', masterId)
      .eq('status', 'confirmed')
      .gte('date', fromDateStr)
      .lte('date', toDateStr);

    if (error) {
      console.error(`[reminders] supabase error (${hoursLeft}h window):`, error);
      continue;
    }

    // Дополнительная фильтрация по точному времени
    for (const booking of bookings) {
      const bookingDt = new Date(`${booking.date}T${booking.time}`);
      const diffMs = bookingDt - now;
      const diffMin = diffMs / 60000;

      if (diffMin >= windowMin && diffMin <= windowMax) {
        try {
          await notifyReminder({
            tgUserId: booking.tg_user_id,
            serviceName: booking.services?.name || '',
            date: booking.date,
            time: booking.time.slice(0, 5),
            address,
            hoursLeft,
          });
          results.sent++;
        } catch {
          results.errors++;
        }
      }
    }
  }

  console.log(`[reminders] done: sent=${results.sent}, errors=${results.errors}`);
  res.status(200).json(results);
}
