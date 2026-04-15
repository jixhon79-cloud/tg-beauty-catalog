import { supabase } from './_lib/supabase.js';

/**
 * GET /api/reviews?limit=20&offset=0
 * Публичный эндпоинт — авторизация не нужна.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const masterId = process.env.MASTER_ID || '1';
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;

  const { data, error } = await supabase
    .from('reviews')
    .select('id, author_name, rating, text, created_at, booking_id, services:bookings(services(name))')
    .eq('master_id', masterId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[reviews] supabase error:', error);
    return res.status(500).json({ error: 'internal_error' });
  }

  // Нормализуем структуру: добавляем поле verified и service_name
  const reviews = data.map(r => ({
    id: r.id,
    author_name: r.author_name,
    rating: r.rating,
    text: r.text,
    created_at: r.created_at,
    verified: !!r.booking_id,
    service_name: r.services?.services?.name || null,
  }));

  res.status(200).json(reviews);
}
