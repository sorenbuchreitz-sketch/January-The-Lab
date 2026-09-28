import { SourceArticle, Story } from '../types';

export const SUPABASE_URL =
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  'https://cgfqfemomkngvoeidbfd.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || '';

function stripHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch stories directly from Supabase REST API (browser-side).
 */
export async function fetchStoriesDirectFromSupabase(): Promise<Story[]> {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY secret is not set in the environment.');
  }

  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const endpoint = `${SUPABASE_URL}/rest/v1/compass_articles?select=id,event_id,title,standfirst,article_text,key_points,source_count,created_at,image_urls,pexels_image_urls,events!event_id!inner(id,title,topic,scope)&created_at=gte.${fourDaysAgo}&order=created_at.desc&limit=200`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Supabase HTTP ${res.status} (${res.statusText}): ${errText.slice(0, 180)}`);
    }

    const data = (await res.json()) as Story[];
    const seenEventIds = new Set<string>();
    const filtered: Story[] = [];

    for (const item of data) {
      if (!item.event_id || item.source_count < 7) continue;
      if (!seenEventIds.has(item.event_id)) {
        seenEventIds.add(item.event_id);
        filtered.push(item);
      }
      if (filtered.length >= 20) break;
    }

    if (filtered.length === 0) {
      throw new Error('Supabase returned 0 stories with source_count >= 7 in the last 4 days.');
    }

    return filtered;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Fetch source articles for an event directly from Supabase REST API (browser-side).
 */
export async function fetchSourcesDirectFromSupabase(eventId: string): Promise<SourceArticle[]> {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY secret is not set in the environment.');
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/articles?select=id,source,canonical_outlet,title,summary,url,published_at,country&event_id=eq.${encodeURIComponent(eventId)}&order=published_at.desc&limit=400`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Supabase HTTP ${res.status} (${res.statusText}): ${errText.slice(0, 180)}`);
    }

    const data = (await res.json()) as Array<{
      id: string;
      source: string;
      canonical_outlet?: string;
      title: string;
      summary: string;
      url: string;
      published_at: string;
      country?: string;
    }>;

    const formatted: SourceArticle[] = data.map((d) => ({
      ...d,
      outlet: d.canonical_outlet || d.source,
      summary: stripHtml(d.summary),
    }));

    // Group by outlet to get diverse coverage, max 25
    const byOutlet = new Map<string, SourceArticle[]>();
    for (const s of formatted) {
      const key = s.outlet || 'Unknown';
      if (!byOutlet.has(key)) byOutlet.set(key, []);
      byOutlet.get(key)!.push(s);
    }

    const selected: SourceArticle[] = [];
    for (const [, list] of byOutlet) {
      if (selected.length < 25 && list.length > 0) {
        selected.push(list[0]);
      }
    }
    if (selected.length < 25) {
      for (const s of formatted) {
        if (!selected.includes(s)) {
          selected.push(s);
          if (selected.length >= 25) break;
        }
      }
    }

    return selected;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
