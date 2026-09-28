/**
 * January phone preview — a self-contained copy of the January iOS app's feed card and article
 * page, matched to the app's design as of 28 Sept 2026 (Liquid Glass, iOS type scale, light/dark).
 * Needs only react + lucide-react + Tailwind. Load "DM Sans" from Google Fonts.
 *
 * Laid out at real iPhone size (390 x 844 pt) and scaled down so two phones fit side by side.
 */
import React, { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bookmark,
  Bug,
  ChevronRight,
  Heart,
  Home,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Send,
  User,
  Volume2,
} from "lucide-react";

/* ---------------- types ---------------- */
export interface PhoneArticle {
  headline: string;
  standfirst: string;
  body: string;
  key_points: string[];
}
export interface PhoneClaim {
  type: string; // "partial_coverage" | "disputed" | "consensus"
  claim: string;
  coverage_percentage?: number;
  sources?: string[];
  supporting_sources?: string[];
  contradicting_sources?: string[];
  views?: Array<{ position: string; sources: string[]; percentage: number }>;
}
export interface PhoneSource {
  outlet: string;
  title?: string | null;
  url?: string | null;
  country?: string | null; // ISO code like "us" or a country name
}

/* ---------------- helpers ---------------- */
function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function faviconUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname.replace(/^www\./i, ""))}&sz=128`;
  } catch {
    return null;
  }
}

function countryName(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "Unknown";
  if (v.length === 2) {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(v.toUpperCase()) ?? v.toUpperCase();
    } catch {
      return v.toUpperCase();
    }
  }
  return v;
}

function sourceIntel(list: Array<{ source: string; country?: string | null }>) {
  const byCountry = new Map<string, string[]>();
  for (const s of list) {
    const c = countryName(s.country);
    if (!byCountry.has(c)) byCountry.set(c, []);
    byCountry.get(c)!.push(s.source);
  }
  const total = list.length || 1;
  return {
    countriesCount: byCountry.size,
    totalSources: list.length,
    rows: [...byCountry.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([country, outlets]) => ({
        country,
        pct: Math.round((outlets.length / total) * 1000) / 10,
        line: outlets.slice(0, 2).join(", "),
        more: Math.max(0, outlets.length - 2),
      })),
  };
}

function abbrev(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return (w.length >= 2 ? `${w[0][0]}${w[1][0]}` : name.slice(0, 3)).toUpperCase();
}

/* ---------------- design tokens (from the app) ---------------- */
// iOS text styles used by the app (tailwind.config.ts), in pt at default Dynamic Type.
const T = {
  largeTitle: { fontSize: 34, lineHeight: "41px" },
  title2: { fontSize: 22, lineHeight: 1.25 },
  body: { fontSize: 17, lineHeight: 1.65 },
  subhead: { fontSize: 15, lineHeight: "20px" },
  footnote: { fontSize: 13, lineHeight: "18px" },
  caption1: { fontSize: 12, lineHeight: "16px" },
  caption2: { fontSize: 11, lineHeight: "13px" },
} as const;

const FONT: React.CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" };

// Liquid Glass materials (src/styles/liquid-glass.css)
const GLASS_CLEAR: React.CSSProperties = {
  backgroundColor: "rgb(255 255 255 / 0.14)",
  border: "0.5px solid rgb(255 255 255 / 0.3)",
  backdropFilter: "blur(14px) saturate(170%) brightness(1.04)",
  WebkitBackdropFilter: "blur(14px) saturate(170%) brightness(1.04)",
  boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.75), inset 0 -0.5px 0 rgb(0 0 0 / 0.06), 0 8px 28px rgb(0 0 0 / 0.1)",
};
const glassRegular = (dark: boolean): React.CSSProperties => ({
  backgroundColor: dark ? "rgb(38 38 40 / 0.55)" : "rgb(255 255 255 / 0.58)",
  border: `0.5px solid ${dark ? "rgb(255 255 255 / 0.14)" : "rgb(255 255 255 / 0.55)"}`,
  backdropFilter: "blur(22px) saturate(180%)",
  WebkitBackdropFilter: "blur(22px) saturate(180%)",
  boxShadow: `inset 0 1px 0 ${dark ? "rgb(255 255 255 / 0.22)" : "rgb(255 255 255 / 0.75)"}, inset 0 -0.5px 0 rgb(0 0 0 / 0.06), 0 8px 28px ${
    dark ? "rgb(0 0 0 / 0.45)" : "rgb(0 0 0 / 0.1)"
  }`,
});

const DEFAULT_LOGO_WHITE = "https://neutral-lens-digest.vercel.app/january-jdot-white.png";

const PHONE_W = 390;
const PHONE_H = 844;
const SAFE_TOP = 47;
const SAFE_BOTTOM = 34;
const SCALE = 0.62;

/* ---------------- frame ---------------- */
function PhoneFrame({ children, dark }: { children: ReactNode; dark: boolean }) {
  const w = PHONE_W + 20;
  const h = PHONE_H + 20;
  return (
    <div className="shrink-0" style={{ width: w * SCALE, height: h * SCALE }}>
      <div
        className={cn("relative origin-top-left overflow-hidden rounded-[52px] border-[10px] border-neutral-900 text-left shadow-2xl", dark ? "bg-black" : "bg-white")}
        style={{ ...FONT, width: w, height: h, transform: `scale(${SCALE})` }}
      >
        <div className={cn("absolute inset-x-0 top-0 z-30 flex h-[47px] items-center justify-between px-8 text-[15px] font-semibold", dark ? "text-white" : "text-black")}>
          <span>9:41</span>
          <span className="flex h-[12px] w-[25px] items-center rounded-[4px] border border-current p-[1.5px] opacity-90">
            <span className="h-full w-full rounded-[2px] bg-current" />
          </span>
        </div>
        <div className="absolute left-1/2 top-[11px] z-40 h-[34px] w-[120px] -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

/* ---------------- dock (FloatingDock) ---------------- */
function Dock({ variant }: { variant: "feed" | "light" | "dark" }) {
  const feed = variant === "feed";
  const dark = variant === "dark";
  const items = [Home, MessageCircle, Plus, MessageSquare, User];
  const iconIdle = feed ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]" : dark ? "text-white" : "text-[#111]";
  return (
    <div className="absolute inset-x-0 z-30 flex justify-center px-4" style={{ bottom: SAFE_BOTTOM + 24 }}>
      <div className="relative flex items-center gap-0 rounded-full px-[8px] py-1" style={feed ? GLASS_CLEAR : glassRegular(dark)}>
        {items.map((Icon, i) => {
          const isCreate = i === 2;
          const isActive = feed && i === 0;
          return (
            <div key={i} className="relative flex h-[42px] w-[52px] items-center justify-center">
              {isActive && <div className="absolute inset-y-0 -inset-x-[4px] rounded-full bg-white/15" />}
              {isCreate ? (
                <div
                  className={cn(
                    "flex h-[34px] w-[34px] items-center justify-center rounded-[12px]",
                    feed || dark ? "bg-white/90 text-black" : "bg-[#111] text-white",
                  )}
                >
                  <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
                </div>
              ) : (
                <Icon className={cn("relative z-10 h-[22px] w-[22px]", iconIdle)} strokeWidth={isActive ? 2.4 : 2.1} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- feed card (ImmersiveEventCard + HomePage header) ---------------- */
function FeedScreen({ category, article, image, logoUrl }: { category: string; article: PhoneArticle; image: string | null; logoUrl: string }) {
  const caption = (article.standfirst ?? "").slice(0, 34).trimEnd();
  return (
    <PhoneFrame dark>
      {image ? (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "center 25%" }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-800 to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

      {/* Header: logo · News / Following / Explore · search */}
      <div className="absolute inset-x-0 z-20 px-5" style={{ top: SAFE_TOP + 10 }}>
        <div className="grid min-h-[36px] grid-cols-3 items-center gap-3">
          <div className="flex h-9 items-center justify-self-start">
            <img src={logoUrl} alt="January" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center justify-center gap-3 justify-self-center" style={T.subhead}>
            <span className="shrink-0 border-b-2 border-white px-0.5 pb-0.5 font-extrabold text-white">News</span>
            <span className="shrink-0 border-b-2 border-transparent px-0.5 pb-0.5 font-semibold text-white/60">Following</span>
            <span className="shrink-0 border-b-2 border-transparent px-0.5 pb-0.5 font-semibold text-white/60">Explore</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center justify-self-end text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
            <Search className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Bottom stack: headline + meta left, engagement rail right */}
      <div className="absolute inset-x-0 z-20 px-5" style={{ bottom: 68 + SAFE_BOTTOM }}>
        <div className="mb-4">
          <h2 className="mb-1.5 pr-14 font-semibold leading-snug text-white" style={{ fontSize: 17 }}>
            {article.headline}
          </h2>
          <p className="mb-2 pr-14 text-white/65" style={T.subhead}>
            {caption}... more
          </p>
          <div className="flex items-center gap-1">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2" style={T.subhead}>
              <span className="font-medium text-white/70">Just now</span>
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-white/60">{category}</span>
            </div>
            <div className="relative -mr-3 w-12 shrink-0">
              <div className="absolute bottom-0 right-0 flex flex-col-reverse items-center gap-5">
                {[Bookmark, Send, MessageCircle, Heart, Volume2].map((Icon, i) => (
                  <span key={i} className="flex h-6 w-12 items-center justify-center">
                    <Icon className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={2} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dock variant="feed" />
    </PhoneFrame>
  );
}

/* ---------------- article page (EventPage) ---------------- */
const TABS = ["Key points", "Article", "Partial coverage", "Sources"] as const;
type ArticleTab = (typeof TABS)[number];

function OutletLogo({ name, url, size = 40, dark }: { name: string; url?: string | null; size?: number; dark: boolean }) {
  const [failed, setFailed] = useState(false);
  const fav = faviconUrl(url);
  return fav && !failed ? (
    <img src={fav} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  ) : (
    <div className="flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span className={cn("text-center font-bold leading-tight", dark ? "text-[#a3a3a3]" : "text-[#737373]")} style={{ fontSize: 10 }}>
        {abbrev(name)}
      </span>
    </div>
  );
}

function ArticleScreen({
  article,
  image,
  photoCredit,
  claims,
  sources,
  tab,
  onTab,
  dark,
}: {
  article: PhoneArticle;
  image: string | null;
  photoCredit?: string | null;
  claims: PhoneClaim[];
  sources: PhoneSource[];
  tab: ArticleTab;
  onTab: (t: ArticleTab) => void;
  dark: boolean;
}) {
  const fg = dark ? "text-white" : "text-[#111]";
  const muted = dark ? "text-[#a3a3a3]" : "text-[#737373]";
  const dot = dark ? "bg-white" : "bg-[#111]";
  const hairline = dark ? "rgba(255,255,255,0.14)" : "rgba(17,17,17,0.12)";
  const track = dark ? "rgba(255,255,255,0.1)" : "rgba(17,17,17,0.06)";
  const bar = (i: number) => `rgba(${dark ? "255,255,255" : "17,17,17"},${[1, 0.72, 0.52, 0.38, 0.28][Math.min(i, 4)]})`;

  const uniqueSources = useMemo(() => {
    const seen = new Set<string>();
    return sources
      .map((s) => ({ source: (s.outlet || "").trim(), title: s.title, url: s.url, country: s.country }))
      .filter((s) => s.source && !seen.has(s.source) && (seen.add(s.source), true));
  }, [sources]);
  const intel = useMemo(() => sourceIntel(uniqueSources), [uniqueSources]);
  const urlFor = (o: string) => uniqueSources.find((s) => s.source === o)?.url;
  const partial = claims.filter((c) => c.type === "partial_coverage");
  const disputed = claims.filter((c) => c.type === "disputed");
  const paragraphs = (article.body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const heroH = Math.round(PHONE_H * 0.4);
  const [pastHero, setPastHero] = useState(false);

  const logos = (outlets: string[]) =>
    outlets.slice(0, 6).map((o) => (
      <span key={o} title={o} className="inline-flex">
        <OutletLogo name={o} url={urlFor(o)} size={20} dark={dark} />
      </span>
    ));

  return (
    <PhoneFrame dark={dark}>
      {pastHero && <div className={cn("absolute inset-x-0 top-0 z-20 h-[47px]", dark ? "bg-black" : "bg-white")} />}
      {/* Header floats over the hero */}
      <div className="absolute inset-x-0 z-20 flex items-center justify-between px-4 text-white" style={{ top: SAFE_TOP + 6, opacity: pastHero ? 0 : 1 }}>
        <span className="p-1 drop-shadow-md">
          <ArrowLeft className="h-6 w-6" strokeWidth={2} />
        </span>
        <div className="flex items-center gap-6">
          <Bug className="h-5 w-5 drop-shadow-md" strokeWidth={2} />
          <Send className="h-5 w-5 drop-shadow-md" strokeWidth={2} />
          <Bookmark className="h-5 w-5 drop-shadow-md" strokeWidth={2} />
        </div>
      </div>

      <div className={cn("absolute inset-0 overflow-y-auto pb-40 [scrollbar-width:none]", dark ? "bg-black" : "bg-white")} onScroll={(e) => setPastHero(e.currentTarget.scrollTop > heroH - SAFE_TOP)}>
        {/* Hero */}
        <div className="relative w-full bg-[#0a0a0a]" style={{ height: heroH }}>
          {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "center 25%" }} />}
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/45 to-transparent" />
          {photoCredit && (
            <p className="absolute bottom-0 right-0 px-3 pb-2.5 text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" style={T.caption2}>
              Photo: {photoCredit}
            </p>
          )}
        </div>

        <div className={cn("mt-5 px-4", muted)} style={T.subhead}>
          {uniqueSources.length} sources · just now
        </div>
        <h1 className={cn("mt-4 px-4 font-semibold", fg)} style={T.title2}>
          {article.headline}
        </h1>
        {article.standfirst && (
          <p className={cn("mt-3 px-4 font-medium", dark ? "text-white/75" : "text-[#111]/75")} style={{ fontSize: 17, lineHeight: 1.6 }}>
            {article.standfirst}
          </p>
        )}

        {/* Tab bar */}
        <div className={cn("sticky z-10 mt-4", dark ? "bg-black" : "bg-white")} style={{ top: SAFE_TOP }}>
          <div className="flex w-full px-4">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTab(t)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center bg-transparent px-1 pb-2 pt-2",
                  tab === t ? cn("font-bold", fg) : cn("font-normal", muted),
                )}
              >
                <span className="whitespace-nowrap" style={T.caption1}>
                  {t}
                </span>
                <span className={cn("mt-1.5 h-[1.5px] w-[22px] rounded-full", dot, tab === t ? "opacity-100" : "opacity-0")} />
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-3">
          {tab === "Key points" && (
            <ul className="mt-1 space-y-4">
              {(article.key_points ?? []).map((k, i) => (
                <li key={i} className="flex gap-3">
                  <span className={cn("mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                  <p className={cn("font-medium", fg)} style={T.body}>
                    {k}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {tab === "Article" && (
            <div className="space-y-4">
              {paragraphs.map((p, i) =>
                i === 0 ? (
                  <p key={i} className={cn("overflow-hidden font-medium", fg)} style={T.body}>
                    <span className={cn("float-left font-black leading-none", fg)} style={{ fontSize: "3.6rem", marginRight: 4 }}>
                      {p[0]}
                    </span>
                    {p.slice(1)}
                  </p>
                ) : (
                  <p key={i} className={cn("font-medium", fg)} style={T.body}>
                    {p}
                  </p>
                ),
              )}
            </div>
          )}

          {tab === "Partial coverage" && (
            <div className="space-y-6">
              {partial.length > 0 && (
                <ul className="space-y-4">
                  {partial.map((c, i) => {
                    const outlets = c.sources ?? c.supporting_sources ?? [];
                    const pct = typeof c.coverage_percentage === "number" ? c.coverage_percentage : 0;
                    return (
                      <li key={i} className={cn("flex gap-2 font-medium", fg)} style={T.body}>
                        <span className={cn("mt-2 block h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                        <div className="min-w-0 flex-1">
                          <p>{c.claim}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className={muted} style={T.caption2}>
                              {pct > 0 ? `${pct}% of sources` : `${outlets.length} of ${uniqueSources.length} sources`}
                            </span>
                            {logos(outlets)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {disputed.length > 0 && (
                <div className="space-y-5">
                  <p className={cn("font-bold tracking-[0.01em]", fg)} style={T.footnote}>
                    Disputed
                  </p>
                  {disputed.map((c, i) => {
                    const views = (c.views ?? []).filter((v) => v.position);
                    return (
                      <div key={i}>
                        <p className={cn("font-semibold", dark ? "text-white" : "text-[#1A1A2E]")} style={{ ...T.subhead, lineHeight: 1.6 }}>
                          {c.claim}
                        </p>
                        {views.length >= 2 ? (
                          <div className="mt-3 space-y-3">
                            {[...views]
                              .sort((a, b) => b.sources.length - a.sources.length || b.percentage - a.percentage)
                              .map((v, vi) => (
                                <div key={vi}>
                                  <p className={cn("leading-snug", vi === 0 ? "font-semibold" : "font-normal", dark ? "text-white" : "text-[#1A1A2E]")} style={T.footnote}>
                                    {v.position}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="uppercase tracking-[0.08em] text-[#888888]" style={T.caption2}>
                                      {v.sources.length} {v.sources.length === 1 ? "source" : "sources"}
                                      {v.percentage > 0 ? ` · ${v.percentage}%` : ""}
                                    </span>
                                    {logos(v.sources)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">{logos([...(c.supporting_sources ?? []), ...(c.contradicting_sources ?? [])])}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {partial.length === 0 && disputed.length === 0 && (
                <div className={cn("mb-4 rounded-2xl p-6 text-center", dark ? "bg-white/10" : "bg-neutral-100")}>
                  <p className={cn("font-semibold", muted)} style={T.subhead}>
                    No partial coverage or disputed claims.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "Sources" && (
            <section className="mb-6 pt-2">
              <div className="grid grid-cols-2">
                <div className="pr-4" style={{ borderRight: `0.5px solid ${hairline}` }}>
                  <p className={cn("font-normal tabular-nums", fg)} style={{ ...T.largeTitle, lineHeight: 1 }}>
                    {intel.countriesCount}
                  </p>
                  <p className={cn("mt-2 font-medium uppercase tracking-[0.12em]", muted)} style={T.caption2}>
                    Countries
                  </p>
                </div>
                <div className="pl-4">
                  <p className={cn("font-normal tabular-nums", fg)} style={{ ...T.largeTitle, lineHeight: 1 }}>
                    {intel.totalSources}
                  </p>
                  <p className={cn("mt-2 font-medium uppercase tracking-[0.12em]", muted)} style={T.caption2}>
                    Sources
                  </p>
                </div>
              </div>

              {intel.rows.length > 0 && (
                <div className="mt-10">
                  <p className={cn("font-medium tracking-[0.01em]", muted)} style={T.caption2}>
                    Geographic spread
                  </p>
                  <ul className="mt-4 space-y-6">
                    {intel.rows.map((row, idx) => (
                      <li key={row.country}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className={cn("leading-snug", fg)} style={T.subhead}>
                            {row.country}
                          </span>
                          <span className={cn("tabular-nums", fg)} style={T.caption2}>
                            {row.pct}%
                          </span>
                        </div>
                        <p className={cn("mt-1 italic leading-snug", muted)} style={T.caption1}>
                          {row.line}
                          {row.more > 0 ? ` +${row.more} more` : ""}
                        </p>
                        <div className="mt-2 h-[2px] w-full" style={{ background: track }}>
                          <div className="h-full" style={{ width: `${Math.min(100, row.pct)}%`, backgroundColor: bar(idx) }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uniqueSources.length > 0 && (
                <div className="mt-10">
                  <div className="mb-4 flex items-center gap-3">
                    <span className={cn("font-bold tracking-[0.01em]", fg)} style={T.footnote}>
                      Sources
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 font-bold", muted, dark ? "bg-white/10" : "bg-neutral-100")} style={T.caption2}>
                      {uniqueSources.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {uniqueSources.map((src) => (
                      <li key={src.source} className="flex items-start gap-3">
                        <OutletLogo name={src.source} url={src.url} dark={dark} />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className={cn("font-semibold", fg)} style={T.subhead}>
                            {src.source}
                          </p>
                          {src.title && (
                            <p className={cn("italic leading-snug", muted)} style={T.subhead}>
                              {src.title}
                            </p>
                          )}
                        </div>
                        <ChevronRight className={cn("mt-0.5 h-4 w-4 shrink-0", muted)} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      <Dock variant={dark ? "dark" : "light"} />
    </PhoneFrame>
  );
}

/* ---------------- public component ---------------- */
/**
 * Props:
 * - category: e.g. "Politics"
 * - imageUrl: story photo (optional; a dark gradient is used if missing)
 * - photoCredit: optional, shown as "Photo: …" on the hero like the app
 * - withRules / withoutRules: the two Gemini articles (withRules can be null before the first run)
 * - claims: step 1 claims (partial_coverage and disputed are shown in Partial coverage)
 * - sources: the story's source articles
 * - logoUrl: white January logo for the feed header (defaults to the hosted one)
 */
export function PhonePreview({
  category,
  imageUrl,
  photoCredit,
  withRules,
  withoutRules,
  claims,
  sources,
  logoUrl = DEFAULT_LOGO_WHITE,
}: {
  category: string;
  imageUrl?: string | null;
  photoCredit?: string | null;
  withRules: PhoneArticle | null;
  withoutRules: PhoneArticle;
  claims: PhoneClaim[];
  sources: PhoneSource[];
  logoUrl?: string;
}) {
  const [which, setWhich] = useState<"with" | "without">(withRules ? "with" : "without");
  const [tab, setTab] = useState<ArticleTab>("Key points");
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const shown = which === "with" && withRules ? withRules : withoutRules;

  const Segmented = ({ value, options, onChange }: { value: string; options: Array<[string, string, boolean?]>; onChange: (v: string) => void }) => (
    <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-xs font-medium">
      {options.map(([v, label, disabled]) => (
        <button key={v} type="button" disabled={disabled} onClick={() => onChange(v)} className={cn("rounded-md px-3 py-1.5 disabled:opacity-40", value === v ? "bg-white shadow-sm" : "text-neutral-500")}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={which}
            onChange={(v) => setWhich(v as "with" | "without")}
            options={[
              ["with", "With your rules", !withRules],
              ["without", "Without rules"],
            ]}
          />
          <Segmented
            value={appearance}
            onChange={(v) => setAppearance(v as "light" | "dark")}
            options={[
              ["light", "Light"],
              ["dark", "Dark"],
            ]}
          />
        </div>
        <p className="text-[11px] text-neutral-500">Same layout as the January iPhone app. Tap the tabs and scroll inside the phone.</p>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-8">
        <div className="text-center">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">In the feed</div>
          <FeedScreen category={category} article={shown} image={imageUrl ?? null} logoUrl={logoUrl} />
        </div>
        <div className="text-center">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Article page</div>
          <ArticleScreen
            article={shown}
            image={imageUrl ?? null}
            photoCredit={photoCredit}
            claims={claims}
            sources={sources}
            tab={tab}
            onTab={setTab}
            dark={appearance === "dark"}
          />
        </div>
      </div>
    </div>
  );
}
