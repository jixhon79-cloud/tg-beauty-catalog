import { supabase } from './_lib/supabase.js';

// Рабочие слоты — совпадают с data.js
const TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const SLOT_INTERVAL = 60; // минут

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * GET /api/slots?date=2026-04-20
 * Возвращает свободные и занятые слоты на дату.
 * Учитывает длительность услуг: запись на 150 мин блокирует 3 слота.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const masterId = process.env.MASTER_ID || '1';
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'invalid_date', message: 'date must be YYYY-MM-DD' });
  }

  // Воскресенье — выходной
  const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();
  if (dayOfWeek === 0) {
    return res.status(200).json({ available: [], occupied: TIME_SLOTS });
  }

  // Загружаем все подтверждённые записи на дату вместе с длительностью услуги
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('time, services(duration)')
    .eq('master_id', masterId)
    .eq('date', date)
    .eq('status', 'confirmed');

  if (error) {
    console.error('[slots] supabase error:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to load slots' });
  }

  // Вычисляем занятые слоты с учётом длительности
  const occupiedSet = new Set();
  for (const booking of bookings) {
    const startMin = timeToMinutes(booking.time.slice(0, 5));
    const duration = booking.services?.duration ?? SLOT_INTERVAL;
    const slotsCount = Math.ceil(duration / SLOT_INTERVAL);

    for (let i = 0; i < slotsCount; i++) {
      occupiedSet.add(minutesToTime(startMin + i * SLOT_INTERVAL));
    }
  }

  // Убираем слоты в прошлом
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const available = [];
  const occupied = [];

  for (const slot of TIME_SLOTS) {
    const isPast = date === todayStr && timeToMinutes(slot) <= nowMinutes;
    if (isPast || occupiedSet.has(slot)) {
      occupied.push(slot);
    } else {
      available.push(slot);
    }
  }

  res.status(200).json({ available, occupied });
}
