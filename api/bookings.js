import { supabase } from './_lib/supabase.js';
import { requireAuth } from './_lib/auth.js';
import { notifyBookingCreated } from './_lib/notify.js';

/**
 * GET  /api/bookings       — список записей текущего пользователя
 * POST /api/bookings       — создать запись
 */
export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return; // requireAuth уже ответил 401

  const masterId = Number(process.env.MASTER_ID || '1');

  // ──────────────────────────────────────────────────────────
  // GET: список записей пользователя
  // ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, date, time, status, created_at, services(id, name, duration, price, emoji)')
      .eq('master_id', masterId)
      .eq('tg_user_id', user.id)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('[bookings GET] supabase error:', error);
      return res.status(500).json({ error: 'internal_error' });
    }

    return res.status(200).json(data);
  }

  // ──────────────────────────────────────────────────────────
  // POST: создать запись
  // ──────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { service_id, date, time } = req.body || {};

    // Валидация входных данных
    if (!service_id || !date || !time) {
      return res.status(400).json({ error: 'invalid_input', message: 'service_id, date and time are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'invalid_date' });
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: 'invalid_time' });
    }

    // Дата не в прошлом
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      return res.status(400).json({ error: 'date_in_past' });
    }

    // Не слишком далеко в будущем (60 дней)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    if (date > maxDate.toISOString().slice(0, 10)) {
      return res.status(400).json({ error: 'date_too_far' });
    }

    // Услуга существует и принадлежит мастеру
    const { data: service, error: svcErr } = await supabase
      .from('services')
      .select('id, name, duration, price')
      .eq('id', service_id)
      .eq('master_id', masterId)
      .eq('active', true)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: 'service_not_found' });
    }

    // Загружаем профиль мастера для уведомления
    const { data: master } = await supabase
      .from('masters')
      .select('address')
      .eq('id', masterId)
      .single();

    const clientName = [user.first_name, user.last_name].filter(Boolean).join(' ');

    // Создаём запись (partial unique index защитит от двойного бронирования)
    const { data: booking, error: insErr } = await supabase
      .from('bookings')
      .insert({
        master_id: masterId,
        service_id: service.id,
        tg_user_id: user.id,
        tg_username: user.username || null,
        client_name: clientName,
        date,
        time,
        status: 'confirmed',
      })
      .select('id, date, time, status')
      .single();

    if (insErr) {
      // PostgreSQL код 23505 = unique violation = слот занят
      if (insErr.code === '23505') {
        return res.status(400).json({ error: 'slot_taken', message: 'This time slot is already booked' });
      }
      console.error('[bookings POST] supabase error:', insErr);
      return res.status(500).json({ error: 'internal_error' });
    }

    // Уведомление — не блокируем ответ
    notifyBookingCreated({
      tgUserId: user.id,
      clientName,
      serviceName: service.name,
      date,
      time,
      address: master?.address || '',
    });

    return res.status(201).json(booking);
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}
