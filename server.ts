import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  compileAnalyzePrompt,
  compileGeneratePrompt,
  countRuleChanges,
  DEFAULT_RULES,
  getRulesUsedDescription,
  getStep1RuleLines,
} from './src/lib/rules';
import {
  RulesState,
  SourceArticle,
  Step1AnalysisResult,
  Step2ArticleResult,
  Story,
} from './src/types/index';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Gemini SDK with User-Agent header and linked paid API key
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
if (!geminiApiKey) {
  console.warn('[Gemini SDK Warning] No GEMINI_API_KEY or API_KEY set in process.env!');
} else {
  console.log(
    `[Gemini SDK] Initialized with linked API key (${geminiApiKey.slice(0, 6)}...${geminiApiKey.slice(-4)}, length: ${geminiApiKey.length})`
  );
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Flash model is the standard fast & high quality model for both analysis and synthesis
const FLASH_MODEL = 'gemini-3.8-flash';

// Supabase configuration
const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://cgfqfemomkngvoeidbfd.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// In-Memory Caches
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// Rate Limiter
// IP limit: 60 gemini calls / hour (raised to support 20+ runs/hr)
// Global limit: 5000 calls / day
// Stored run counters cleared on start
const ipCallCounts = new Map<string, { count: number; resetAt: number }>();
let globalDailyCount = 0;
let globalResetAt = Date.now() + 24 * 60 * 60 * 1000;

// Helper to determine if a request is from the AI Studio preview environment or has ?admin=1
function isPreviewOrAdmin(req: Request, bodyAdmin?: boolean): boolean {
  if (req.query.admin === '1') return true;
  if (req.headers['x-admin-bypass'] === '1') return true;
  if (bodyAdmin === true) return true;

  const host = (req.headers.host || '').toLowerCase();
  const origin = (req.headers.origin || '').toLowerCase();
  const referer = (req.headers.referer || '').toLowerCase();

  return (
    host.includes('run.app') ||
    host.includes('ais-dev') ||
    host.includes('ais-pre') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    origin.includes('run.app') ||
    origin.includes('googleusercontent.com') ||
    referer.includes('run.app') ||
    referer.includes('googleusercontent.com') ||
    referer.includes('admin=1')
  );
}

function checkRateLimit(ip: string): { allowed: boolean; ourRateLimitHit?: boolean; reason?: string } {
  const now = Date.now();

  // Check global daily cap
  if (now > globalResetAt) {
    globalDailyCount = 0;
    globalResetAt = now + 24 * 60 * 60 * 1000;
  }
  if (globalDailyCount >= 5000) {
    return {
      allowed: false,
      ourRateLimitHit: true,
      reason: "The demo is busy right now. Here's the version without rules.",
    };
  }

  // Check IP hourly cap (raised to 60 calls/hour)
  let ipEntry = ipCallCounts.get(ip);
  if (!ipEntry || now > ipEntry.resetAt) {
    ipEntry = { count: 0, resetAt: now + 60 * 60 * 1000 };
    ipCallCounts.set(ip, ipEntry);
  }

  if (ipEntry.count >= 60) {
    return {
      allowed: false,
      ourRateLimitHit: true,
      reason: "The demo is busy right now. Here's the version without rules.",
    };
  }

  return { allowed: true };
}

function incrementRateLimit(ip: string) {
  globalDailyCount++;
  const entry = ipCallCounts.get(ip);
  if (entry) {
    entry.count++;
  }
}

// Helper: Strip HTML tags and entities
function stripHtmlAndEntities(str: string): string {
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

// Helper: Clean JSON output
function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  // Strip code fences if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Find outermost JSON object
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  return cleaned.trim();
}

function isQuotaOrOverloadError(err: unknown): boolean {
  const e = err as any;
  const msg = [
    e?.message,
    e?.status,
    e?.code,
    e?.error?.message,
    e?.error?.status,
    String(err),
  ].filter(Boolean).join(' ');
  return (
    msg.includes('429') ||
    msg.includes('Quota exceeded') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('overloaded')
  );
}

// Load fallback stories
function getFallbackStoriesData(): {
  stories: Story[];
  sources: Record<string, SourceArticle[]>;
} {
  try {
    const raw = fs.readFileSync(
      path.join(__dirname, 'src', 'data', 'stories.json'),
      'utf-8'
    );
    const parsed = JSON.parse(raw);
    return {
      stories: parsed.stories || [],
      sources: parsed.sources || {},
    };
  } catch (err) {
    console.error('Failed to read fallback stories.json:', err);
    return { stories: [], sources: {} };
  }
}

// Fetch stories list with 10-minute cache and 5s timeout
async function fetchStoriesList(
  forceRefresh = false
): Promise<{ stories: Story[]; isSample: boolean; error?: string }> {
  const cacheKey = 'supabase_stories_list';
  if (!forceRefresh) {
    const cached = getCache<{ stories: Story[]; isSample: boolean; error?: string }>(cacheKey);
    if (cached) return cached;
  }

  const supabaseKey = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_URL;

  if (!supabaseKey) {
    const fallback = getFallbackStoriesData();
    const result = {
      stories: fallback.stories,
      isSample: true,
      error: 'SUPABASE_ANON_KEY secret is not set in the environment.',
    };
    setCache(cacheKey, result, 60); // brief cache for missing key
    return result;
  }

  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const endpoint = `${supabaseUrl}/rest/v1/compass_articles?select=id,event_id,title,standfirst,article_text,key_points,source_count,created_at,image_urls,pexels_image_urls,events!event_id!inner(id,title,topic,scope)&created_at=gte.${fourDaysAgo}&order=created_at.desc&limit=200`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Supabase HTTP ${res.status} (${res.statusText}): ${errBody.slice(0, 150)}`);
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
      const fallback = getFallbackStoriesData();
      const result = {
        stories: fallback.stories,
        isSample: true,
        error: 'Supabase returned 0 stories with source_count >= 7 in the last 4 days.',
      };
      setCache(cacheKey, result, 300);
      return result;
    }

    const result = { stories: filtered, isSample: false };
    setCache(cacheKey, result, 600); // 10 minutes cache
    return result;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errMessage = err instanceof Error ? err.message : String(err);
    console.warn('Supabase fetch stories failed. Using fallback:', errMessage);
    const fallback = getFallbackStoriesData();
    const result = {
      stories: fallback.stories,
      isSample: true,
      error: `Supabase request failed: ${errMessage}`,
    };
    setCache(cacheKey, result, 120); // short cache on error
    return result;
  }
}

// Fetch sources for a story with 30-minute cache and 5s timeout
async function fetchSourcesForStory(
  eventId: string
): Promise<{ sources: SourceArticle[]; isSample: boolean; error?: string }> {
  const cacheKey = `supabase_sources_${eventId}`;
  const cached = getCache<{ sources: SourceArticle[]; isSample: boolean; error?: string }>(cacheKey);
  if (cached) return cached;

  const supabaseKey = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_URL;

  if (!supabaseKey) {
    const fallback = getFallbackStoriesData();
    const sources = (fallback.sources[eventId] || []).map((s) => ({
      ...s,
      outlet: s.canonical_outlet || s.source,
      summary: stripHtmlAndEntities(s.summary),
    }));
    const result = {
      sources,
      isSample: true,
      error: 'SUPABASE_ANON_KEY secret is not set in environment.',
    };
    setCache(cacheKey, result, 300);
    return result;
  }

  const endpoint = `${supabaseUrl}/rest/v1/articles?select=id,source,canonical_outlet,title,summary,url,published_at,country&event_id=eq.${encodeURIComponent(eventId)}&order=published_at.desc&limit=400`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Supabase HTTP ${res.status} (${res.statusText}): ${errBody.slice(0, 150)}`);
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
      summary: stripHtmlAndEntities(d.summary),
    }));

    let finalSources = formatted;
    if (formatted.length > 25) {
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
      finalSources = selected;
    }

    const result = { sources: finalSources, isSample: false };
    setCache(cacheKey, result, 1800);
    return result;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errMessage = err instanceof Error ? err.message : String(err);
    console.warn(`Supabase fetch sources for ${eventId} failed. Using fallback:`, errMessage);
    const fallback = getFallbackStoriesData();
    const sources = (fallback.sources[eventId] || []).map((s) => ({
      ...s,
      outlet: s.canonical_outlet || s.source,
      summary: stripHtmlAndEntities(s.summary),
    }));
    const result = {
      sources,
      isSample: true,
      error: `Supabase sources request failed: ${errMessage}`,
    };
    setCache(cacheKey, result, 300);
    return result;
  }
}

// Helper: Call Gemini with logging and timing
async function callGeminiWithLogging(
  model: string,
  contents: string,
  config: {
    systemInstruction?: string;
    responseMimeType?: string;
    maxOutputTokens?: number;
    temperature?: number;
  },
  stepName: string
): Promise<{ text: string; modelUsed: string }> {
  const startTs = Date.now();
  console.log(`[Gemini Call] model=${model} step="${stepName}" status=STARTED prompt_len=${contents.length}`);
  try {
    const response = await ai.models.generateContent({ model, contents, config });
    const text = response.text || '';
    const durationMs = Date.now() - startTs;
    console.log(`[Gemini Call] model=${model} step="${stepName}" status=200 duration=${durationMs}ms output_len=${text.length}`);
    return { text, modelUsed: model };
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 500;
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startTs;
    console.error(`[Gemini Call] model=${model} step="${stepName}" status=${status} duration=${durationMs}ms error="${message}"`);
    throw err;
  }
}

// STEP 1: Finding the facts
async function runStep1Analysis(
  story: Story,
  sources: SourceArticle[],
  rules: RulesState,
  ip: string,
  skipRateLimit = false
): Promise<{ result: Step1AnalysisResult; modelUsed: string }> {
  const isStandardStep1Rules = countRuleChanges(rules).step1Count === 0;
  const cacheKey = `step1_facts_${story.event_id}_${
    isStandardStep1Rules ? 'standard' : JSON.stringify(getStep1RuleLines(rules))
  }`;

  if (isStandardStep1Rules && !skipRateLimit) {
    const cached = getCache<Step1AnalysisResult>(cacheKey);
    if (cached) return { result: cached, modelUsed: 'gemini-3.8-flash (cached)' };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const articlesList = sources
    .map((src, i) => {
      const pubDate = (src.published_at || todayStr).split('T')[0];
      const summaryTrunc = (src.summary || '').slice(0, 800);
      return `${i + 1}. ${src.outlet}\nPublished: ${pubDate}\nTitle: ${src.title}\nSummary: ${summaryTrunc}`;
    })
    .join('\n\n');

  const userMessage = `TODAY: ${todayStr}\n\nEvent: ${story.title}\n\nArticles from ${sources.length} sources:\n${articlesList}\n\nAnalyze these articles and return the JSON structure specified.`;
  const systemInstruction = compileAnalyzePrompt(rules);

  if (!skipRateLimit) {
    incrementRateLimit(ip);
  }

  let callRes: { text: string; modelUsed: string };
  try {
    callRes = await callGeminiWithLogging(
      'gemini-3.8-flash',
      userMessage,
      {
        systemInstruction,
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
        temperature: 0.2,
      },
      'Step 1: Finding facts'
    );
  } catch (err: unknown) {
    if (isQuotaOrOverloadError(err)) {
      console.warn('[Step 1 Fallback] gemini-3.8-flash limited/unavailable, failing over to gemini-3.1-flash-lite...');
      callRes = await callGeminiWithLogging(
        'gemini-3.1-flash-lite',
        userMessage,
        {
          systemInstruction,
          responseMimeType: 'application/json',
          maxOutputTokens: 4096,
          temperature: 0.2,
        },
        'Step 1: Finding facts (Lite Fallback)'
      );
    } else {
      throw err;
    }
  }

  const cleaned = cleanJsonOutput(callRes.text);
  const parsed = JSON.parse(cleaned) as Step1AnalysisResult;

  setCache(cacheKey, parsed, 21600);
  return { result: parsed, modelUsed: callRes.modelUsed };
}

// STEP 2: Writing the article
async function runStep2Generation(
  story: Story,
  sources: SourceArticle[],
  step1Result: Step1AnalysisResult,
  rules: RulesState,
  ip: string,
  skipRateLimit = false
): Promise<{
  result: Step2ArticleResult;
  modelUsed: string;
  usingFlashFallback: boolean;
}> {
  const todayStr = new Date().toISOString().split('T')[0];
  const distinctOutlets = new Set(sources.map((s) => s.outlet)).size;

  const nonConsensusClaims = (step1Result.claims || []).filter(
    (c) => c.type !== 'consensus'
  );

  const payload = {
    today: todayStr,
    event_title: story.title,
    event_summary: step1Result.event_summary,
    key_facts: step1Result.key_facts,
    claims: nonConsensusClaims,
    source_articles: sources.map((s) => ({
      outlet: s.outlet,
      title: s.title,
      url: s.url,
      published_at: s.published_at,
    })),
    unique_outlets: distinctOutlets,
  };

  const userMessage = JSON.stringify(payload);
  const systemInstruction = compileGeneratePrompt(rules);

  if (!skipRateLimit) {
    incrementRateLimit(ip);
  }

  let callRes: { text: string; modelUsed: string };
  let usingFlashFallback = false;

  // Try Pro model first
  try {
    callRes = await callGeminiWithLogging(
      'gemini-3.1-pro-preview',
      userMessage,
      {
        systemInstruction,
        responseMimeType: 'application/json',
        maxOutputTokens: 3072,
        temperature: 0.3,
      },
      'Step 2: Writing article'
    );
  } catch (proErr: unknown) {
    const errMsg = proErr instanceof Error ? proErr.message : '';
    const errStatus = (proErr as { status?: number })?.status;
    const errStr = `${errMsg} ${JSON.stringify(proErr)}`;

    // Fall back to Flash model on permission, quota, billing, or free-tier restriction
    const isPermissionOrQuotaOrBilling =
      errStatus === 403 ||
      errStatus === 429 ||
      errStatus === 404 ||
      errStr.includes('PERMISSION_DENIED') ||
      errStr.includes('Quota exceeded') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('billing') ||
      errStr.includes('limit: 0') ||
      errStr.includes('free_tier');

    if (isPermissionOrQuotaOrBilling) {
      console.warn(
        `[Step 2 Fallback] gemini-3.1-pro-preview failed (status: ${errStatus || 'quota/billing'}). Automatically falling back to Flash model...`
      );
      usingFlashFallback = true;
      try {
        callRes = await callGeminiWithLogging(
          'gemini-3.8-flash',
          userMessage,
          {
            systemInstruction,
            responseMimeType: 'application/json',
            maxOutputTokens: 3072,
            temperature: 0.3,
          },
          'Step 2: Writing article (Flash Fallback)'
        );
      } catch (flashErr: unknown) {
        if (isQuotaOrOverloadError(flashErr)) {
          console.warn('[Step 2 Fallback] gemini-3.8-flash also limited, falling over to gemini-3.1-flash-lite...');
          callRes = await callGeminiWithLogging(
            'gemini-3.1-flash-lite',
            userMessage,
            {
              systemInstruction,
              responseMimeType: 'application/json',
              maxOutputTokens: 3072,
              temperature: 0.3,
            },
            'Step 2: Writing article (Flash Lite Fallback)'
          );
        } else {
          throw flashErr;
        }
      }
    } else {
      throw proErr;
    }
  }

  const cleaned = cleanJsonOutput(callRes.text);
  const parsed = JSON.parse(cleaned) as Step2ArticleResult;
  return {
    result: parsed,
    modelUsed: callRes.modelUsed,
    usingFlashFallback,
  };
}

// Baseline: No-rules run cached 6 hours per event_id
interface BaselineCachedEntry {
  step1: Step1AnalysisResult;
  step2: Step2ArticleResult;
  meta: {
    outletCount: number;
    durationSeconds: number;
    cached: boolean;
    rulesUsedSummary: string;
    step1Model: string;
    step2Model: string;
    modelUsed: string;
    writtenAt: string;
  };
}

async function getOrCreateBaseline(
  story: Story,
  sources: SourceArticle[],
  ip: string,
  skipRateLimit = false
): Promise<BaselineCachedEntry> {
  const cacheKey = `baseline_${story.event_id}`;
  const cached = getCache<BaselineCachedEntry>(cacheKey);
  if (cached) {
    return {
      ...cached,
      meta: {
        ...cached.meta,
        cached: true,
      },
    };
  }

  const startTime = Date.now();
  // Always a fresh Gemini run of the sources with standard rules (no rules)
  // Never take article_text or key_points from database!
  let step1;
  try {
    step1 = await runStep1Analysis(story, sources, DEFAULT_RULES, ip, skipRateLimit);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    (error as unknown as { failedStep: string }).failedStep = 'facts';
    throw error;
  }

  let step2;
  try {
    step2 = await runStep2Generation(
      story,
      sources,
      step1.result,
      DEFAULT_RULES,
      ip,
      skipRateLimit
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    (error as unknown as { failedStep: string }).failedStep = 'writing';
    throw error;
  }

  const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
  const writtenAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const result: BaselineCachedEntry = {
    step1: step1.result,
    step2: step2.result,
    meta: {
      outletCount: sources.length,
      durationSeconds,
      cached: false,
      rulesUsedSummary: 'Standard rules',
      step1Model: step1.modelUsed,
      step2Model: step2.modelUsed,
      modelUsed: step2.modelUsed,
      writtenAt,
    },
  };

  // Cache for 6 hours (21600s)
  setCache(cacheKey, result, 21600);
  return result;
}

// API Routes

// 1. Stories endpoint
app.get('/api/stories', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await fetchStoriesList(forceRefresh);
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// 2. Sources for story endpoint
app.get('/api/stories/:eventId/sources', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId;
    const data = await fetchSourcesForStory(eventId);
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// 3. Baseline article endpoint
app.get('/api/stories/:eventId/baseline', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const isAdmin = isPreviewOrAdmin(req);
  try {
    const eventId = req.params.eventId;
    const storiesRes = await fetchStoriesList();
    const story = storiesRes.stories.find((s) => s.event_id === eventId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const sourcesRes = await fetchSourcesForStory(eventId);
    const baseline = await getOrCreateBaseline(story, sourcesRes.sources, ip, isAdmin);

    res.json({
      step1: baseline.step1,
      step2: baseline.step2,
      meta: baseline.meta,
      isBaseline: true,
    });
  } catch (err: unknown) {
    const errStatus = (err as { status?: number })?.status || 500;
    const failedStep = (err as { failedStep?: string })?.failedStep || 'baseline';
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Baseline Error] Step: ${failedStep} | Status: ${errStatus} | Details:`, message);
    res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
      error: true,
      failedStep,
      statusCode: errStatus,
      message,
    });
  }
});

// 4. Pipeline Run endpoint
app.post('/api/pipeline/run', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const startTime = Date.now();

  const { eventId, rules, admin } = req.body as {
    eventId: string;
    rules: RulesState;
    admin?: boolean;
  };

  const isAdmin = isPreviewOrAdmin(req, admin);

  if (isAdmin) {
    console.log(`[Rate Limit Bypass Active] AI Studio preview / admin bypass active for IP ${ip}`);
  } else {
    // Check rate limit only when NOT preview or admin
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      console.warn(`[Rate Limit Hit] IP ${ip} exceeded hourly/daily rate limit.`);
      return res.status(429).json({
        ourRateLimitHit: true,
        rateLimited: true,
        message:
          rateLimitCheck.reason ||
          "The demo is busy right now. Here's the version without rules.",
      });
    }
  }

  if (!eventId || !rules) {
    return res.status(400).json({ error: 'Missing eventId or rules' });
  }

  try {
    const storiesRes = await fetchStoriesList();
    const story = storiesRes.stories.find((s) => s.event_id === eventId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const sourcesRes = await fetchSourcesForStory(eventId);
    const sources = sourcesRes.sources;

    // Check result cache: hash of (event_id + JSON.stringify(rules))
    const rulesHash = Buffer.from(JSON.stringify(rules)).toString('base64');
    const resultCacheKey = `pipeline_run_${eventId}_${rulesHash}`;
    const cachedResult = !isAdmin
      ? getCache<{
          step1: Step1AnalysisResult;
          step2: Step2ArticleResult;
          step1Model: string;
          step2Model: string;
          modelUsed?: string;
          writtenAt?: string;
          usingFlashFallback: boolean;
        }>(resultCacheKey)
      : null;

    const rulesUsedDesc = getRulesUsedDescription(rules);

    if (cachedResult) {
      return res.json({
        step1: cachedResult.step1,
        step2: cachedResult.step2,
        meta: {
          outletCount: sources.length,
          durationSeconds: 0,
          cached: true,
          rulesUsedSummary: rulesUsedDesc,
          step1Model: cachedResult.step1Model,
          step2Model: cachedResult.step2Model,
          modelUsed: cachedResult.modelUsed || cachedResult.step2Model,
          writtenAt: cachedResult.writtenAt || 'Earlier',
          usingFlashFallback: cachedResult.usingFlashFallback,
        },
      });
    }

    // Step 1: Finding facts
    let step1Data;
    try {
      step1Data = await runStep1Analysis(story, sources, rules, ip, isAdmin);
    } catch (err: unknown) {
      const errStatus = (err as { status?: number })?.status || 500;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Step 1 Facts Error] Status: ${errStatus} | Details:`, errMsg);
      return res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
        error: true,
        failedStep: 'facts',
        statusCode: errStatus,
        message: errMsg || 'Failed during facts extraction',
      });
    }

    // Step 2: Writing article
    let step2Data;
    try {
      step2Data = await runStep2Generation(
        story,
        sources,
        step1Data.result,
        rules,
        ip,
        isAdmin
      );
    } catch (err: unknown) {
      const errStatus = (err as { status?: number })?.status || 500;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Step 2 Writing Error] Status: ${errStatus} | Details:`, errMsg);
      return res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
        error: true,
        failedStep: 'writing',
        statusCode: errStatus,
        message: errMsg || 'Failed during article writing',
      });
    }

    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.now() - startTime) / 1000)
    );
    const writtenAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Save to 6-hour result cache
    setCache(
      resultCacheKey,
      {
        step1: step1Data.result,
        step2: step2Data.result,
        step1Model: step1Data.modelUsed,
        step2Model: step2Data.modelUsed,
        modelUsed: step2Data.modelUsed,
        writtenAt,
        usingFlashFallback: step2Data.usingFlashFallback,
      },
      21600
    );

    res.json({
      step1: step1Data.result,
      step2: step2Data.result,
      meta: {
        outletCount: sources.length,
        durationSeconds: elapsedSeconds,
        cached: false,
        rulesUsedSummary: rulesUsedDesc,
        step1Model: step1Data.modelUsed,
        step2Model: step2Data.modelUsed,
        modelUsed: step2Data.modelUsed,
        writtenAt,
        usingFlashFallback: step2Data.usingFlashFallback,
      },
    });
  } catch (err: unknown) {
    const errStatus = (err as { status?: number })?.status || 500;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Pipeline Error] Status: ${errStatus} | Details:`, errMsg);

    res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
      error: true,
      statusCode: errStatus,
      message: errMsg || 'Service temporarily unavailable',
    });
  }
});

// Admin Reset Limits endpoint
app.post('/api/admin/reset-limits', (_req: Request, res: Response) => {
  ipCallCounts.clear();
  globalDailyCount = 0;
  console.log('[Rate Limits Reset] Cleared all in-memory rate limit counters.');
  res.json({ success: true, message: 'All rate limits reset' });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Handle HTML requests by transforming index.html with Vite
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The Lab by January server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
