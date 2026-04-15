import { supabase } from './_lib/supabase.js';

/**
 * GET /api/services?category=Маникюр
 * Возвращает активные услуги мастера, опционально фильтруя по категории.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const masterId = process.env.MASTER_ID || '1';
  const { category } = req.query;

  let query = supabase
    .from('services')
    .select('id, name, short_desc, description, category, duration, price, popular, emoji, gradient, sort_order')
    .eq('master_id', masterId)
    .eq('active', true)
    .order('sort_order');

  if (category && category !== 'Все') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[services] supabase error:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to load services' });
  }

  res.status(200).json(data);
}
