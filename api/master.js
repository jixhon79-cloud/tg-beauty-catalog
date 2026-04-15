import { supabase } from './_lib/supabase.js';

/**
 * GET /api/master
 * Возвращает публичный профиль мастера (без токена бота).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const masterId = process.env.MASTER_ID || '1';

  const { data, error } = await supabase
    .from('masters')
    .select('id, name, title, tagline, address, metro, map_url, working_hours, photo_url, rating, reviews_count, works_count, clients_count')
    .eq('id', masterId)
    .single();

  if (error || !data) {
    console.error('[master] supabase error:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Failed to load master' });
  }

  res.status(200).json(data);
}
