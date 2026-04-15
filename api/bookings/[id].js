import { supabase } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';
import { notifyBookingCancelled } from '../_lib/notify.js';

/**
 * DELETE /api/bookings/:id — отменить запись
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const bookingId = Number(req.query.id);
  if (!bookingId) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  // Загружаем запись — проверяем что она существует и принадлежит этому пользователю
  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('id, tg_user_id, status, date, time, services(name)')
    .eq('id', bookingId)
    .single();

  if (fetchErr || !booking) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (booking.tg_user_id !== user.id) {
    return res.status(403).json({ error: 'forbidden' });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({ error: 'already_cancelled' });
  }

  // Отменяем
  const { error: updErr } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (updErr) {
    console.error('[bookings DELETE] supabase error:', updErr);
    return res.status(500).json({ error: 'internal_error' });
  }

  // Уведомление об отмене
  notifyBookingCancelled({
    tgUserId: user.id,
    serviceName: booking.services?.name || '',
    date: booking.date,
    time: booking.time.slice(0, 5),
  });

  return res.status(200).json({ status: 'cancelled' });
}
