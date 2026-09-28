import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import {
  CheckItem,
  PipelineExecutionMeta,
  RulesState,
  SourceArticle,
  Step1AnalysisResult,
  Step2ArticleResult,
  Story,
  RunErrorInfo,
} from './types';
import {
  DEFAULT_RULES,
  loadSavedRules,
  saveRulesToStorage,
  countRuleChanges,
} from './lib/rules';
import { runArticleChecks } from './lib/checks';
import { Header } from './components/Header';
import { StoryPicker } from './components/StoryPicker';
import { SourcesDrawer } from './components/SourcesDrawer';
import { RulesPanel } from './components/RulesPanel';
import { CompareTab } from './components/CompareTab';
import { FactsFoundTab } from './components/FactsFoundTab';
import { ChecksTab } from './components/ChecksTab';
import { PhonePreviewTab } from './components/PhonePreviewTab';
import { Footer } from './components/Footer';
import fallbackData from './data/stories.json';
import {
  fetchStoriesDirectFromSupabase,
  fetchSourcesDirectFromSupabase,
} from './lib/supabaseClient';
import {
  Play,
  Square,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6 text-neutral-900 font-sans">
          <div className="max-w-md w-full bg-white rounded-md border border-neutral-300 p-6 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Application Rendering Notice
              </h2>
              <p className="text-xs text-neutral-600 mt-1">
                {this.state.error?.message ||
                  'The application encountered an unexpected issue while rendering. Press reload to continue.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full bg-neutral-950 text-white text-xs font-semibold py-2.5 rounded-md hover:bg-neutral-800 transition-colors"
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const fallbackStories: Story[] = (fallbackData.stories || []) as unknown as Story[];
const fallbackSourcesMap: Record<string, SourceArticle[]> = (fallbackData.sources || {}) as unknown as Record<string, SourceArticle[]>;

export const AppContent: React.FC = () => {
  // Stories & Sources state (pre-initialized with fallback to guarantee immediate render)
  const [stories, setStories] = useState<Story[]>(fallbackStories);
  const [selectedStory, setSelectedStory] = useState<Story | null>(
    fallbackStories.length > 0 ? fallbackStories[0] : null
  );
  const [sources, setSources] = useState<SourceArticle[]>(() => {
    const firstId = fallbackStories[0]?.event_id;
    return (firstId && fallbackSourcesMap[firstId]) || [];
  });
  const [isSampleStories, setIsSampleStories] = useState<boolean>(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [isLoadingStories, setIsLoadingStories] = useState<boolean>(false);
  const [isSourcesDrawerOpen, setIsSourcesDrawerOpen] = useState<boolean>(false);

  // Baseline data strictly written by Gemini (cached 6 hours per event_id on server)
  const [baselineStep1, setBaselineStep1] = useState<Step1AnalysisResult | null>(null);
  const [baselineArticle, setBaselineArticle] = useState<Step2ArticleResult | null>(null);
  const [baselineMeta, setBaselineMeta] = useState<PipelineExecutionMeta | null>(null);
  const [isLoadingBaseline, setIsLoadingBaseline] = useState<boolean>(true);

  // Rules state
  const [rules, setRules] = useState<RulesState>(loadSavedRules);

  // Custom Pipeline run data
  const [customStep1, setCustomStep1] = useState<Step1AnalysisResult | null>(null);
  const [customArticle, setCustomArticle] = useState<Step2ArticleResult | null>(null);
  const [hasCustomRun, setHasCustomRun] = useState<boolean>(false);
  const [runMeta, setRunMeta] = useState<PipelineExecutionMeta | null>(null);

  // Execution state & progress timer
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPhase, setProgressPhase] = useState<'facts' | 'writing'>('facts');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runError, setRunError] = useState<RunErrorInfo | null>(null);
  const [baselineError, setBaselineError] = useState<RunErrorInfo | null>(null);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  // Admin bypass (?admin=1 or inside AI Studio preview environment)
  const isAdmin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const search = window.location.search;
    const host = window.location.hostname.toLowerCase();
    const inIframe = window.self !== window.top;
    return (
      new URLSearchParams(search).get('admin') === '1' ||
      inIframe ||
      host.includes('run.app') ||
      host.includes('ais-dev') ||
      host.includes('ais-pre') ||
      host.includes('googleusercontent.com') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    );
  }, []);

  // Reset stored run counters on mount
  useEffect(() => {
    try {
      localStorage.removeItem('the_lab_visitor_runs_v1');
      localStorage.removeItem('the_lab_visitor_runs');
      localStorage.removeItem('the_lab_visitor_runs_v2');
    } catch {
      // Ignore
    }
  }, []);

  // Active tab: 'compare' | 'facts' | 'checks' | 'phone'
  const [activeTab, setActiveTab] = useState<'compare' | 'facts' | 'checks' | 'phone'>('compare');

  // AbortController ref
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Save rules changes to localStorage
  const handleRulesChange = (newRules: RulesState) => {
    setRules(newRules);
    saveRulesToStorage(newRules);
  };

  // Load stories on mount: try server proxy first, then direct Supabase, fallback to sample stories
  const loadStories = async (forceRefresh = false) => {
    setIsLoadingStories(true);
    let errorDetail: string | null = null;

    // 1. Try server proxy endpoint
    try {
      const endpoint = forceRefresh ? '/api/stories?refresh=true' : '/api/stories';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.stories && data.stories.length > 0 && !data.isSample) {
          setStories(data.stories);
          setIsSampleStories(false);
          setSupabaseError(null);
          setSelectedStory((prev) => {
            if (prev && data.stories.some((s: Story) => s.id === prev.id)) {
              return prev;
            }
            return data.stories[0];
          });
          setIsLoadingStories(false);
          return;
        } else if (data.error) {
          errorDetail = data.error;
        }
      } else {
        const text = await res.text().catch(() => '');
        errorDetail = `Server /api/stories returned status ${res.status}: ${text.slice(0, 160) || res.statusText}`;
      }
    } catch (err: unknown) {
      errorDetail = err instanceof Error ? err.message : String(err);
    }

    // 2. Try direct browser connection to Supabase
    try {
      const directStories = await fetchStoriesDirectFromSupabase();
      if (directStories && directStories.length > 0) {
        setStories(directStories);
        setIsSampleStories(false);
        setSupabaseError(null);
        setSelectedStory((prev) => {
          if (prev && directStories.some((s) => s.id === prev.id)) {
            return prev;
          }
          return directStories[0];
        });
        setIsLoadingStories(false);
        return;
      }
    } catch (directErr: unknown) {
      const directMsg = directErr instanceof Error ? directErr.message : String(directErr);
      errorDetail = errorDetail
        ? `${errorDetail} · (Direct Supabase client: ${directMsg})`
        : `Direct Supabase client: ${directMsg}`;
    }

    // 3. If both failed, keep bundled stories and display error banner
    setIsSampleStories(true);
    setSupabaseError(errorDetail || 'Failed to fetch stories from Supabase database.');
    setIsLoadingStories(false);
  };

  useEffect(() => {
    loadStories();
  }, []);

  // When selected story changes, update baseline & sources
  useEffect(() => {
    if (!selectedStory) return;

    let mounted = true;
    setCustomArticle(null);
    setCustomStep1(null);
    setHasCustomRun(false);
    setRunMeta(null);
    setErrorMessage(null);
    setRunError(null);
    setBaselineError(null);
    setRateLimitNotice(null);
    setBaselineArticle(null);
    setBaselineStep1(null);
    setBaselineMeta(null);

    // Check local fallback sources first for instant response
    const localSources = fallbackSourcesMap[selectedStory.event_id];
    if (localSources && localSources.length > 0) {
      setSources(localSources);
    }

    // Then attempt server fetch or direct fetch for sources and Gemini baseline
    async function loadStoryDetails() {
      if (!selectedStory) return;
      setIsLoadingBaseline(true);
      try {
        let sourcesLoaded = false;
        const sourcesRes = await fetch(`/api/stories/${selectedStory.event_id}/sources`);
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json();
          if (mounted && sourcesData.sources && sourcesData.sources.length > 0 && !sourcesData.isSample) {
            setSources(sourcesData.sources);
            sourcesLoaded = true;
          }
        }

        if (!sourcesLoaded) {
          try {
            const directSources = await fetchSourcesDirectFromSupabase(selectedStory.event_id);
            if (mounted && directSources && directSources.length > 0) {
              setSources(directSources);
              sourcesLoaded = true;
            }
          } catch {
            // Keep current sources
          }
        }

        const baselineRes = await fetch(
          `/api/stories/${selectedStory.event_id}/baseline${isAdmin ? '?admin=1' : ''}`,
          {
            headers: isAdmin ? { 'x-admin-bypass': '1' } : {},
          }
        );
        if (baselineRes.ok) {
          const baselineData = await baselineRes.json();
          if (mounted && baselineData.step1 && baselineData.step2) {
            setBaselineStep1(baselineData.step1);
            setBaselineArticle(baselineData.step2);
            if (baselineData.meta) {
              setBaselineMeta(baselineData.meta);
            }
            setBaselineError(null);
          }
        } else {
          const errData = await baselineRes.json().catch(() => ({}));
          if (mounted) {
            setBaselineError({
              step: errData.failedStep || 'baseline',
              statusCode: errData.statusCode || baselineRes.status,
              message: errData.message || baselineRes.statusText || 'Failed to generate baseline',
            });
          }
        }
      } catch (err) {
        console.warn('Baseline/sources API notice:', err);
      } finally {
        if (mounted) setIsLoadingBaseline(false);
      }
    }

    loadStoryDetails();

    return () => {
      mounted = false;
    };
  }, [selectedStory, isAdmin]);

  // Visitor rate limit helpers (raised to 20 runs per hour)
  const checkVisitorLimit = (): boolean => {
    try {
      const raw = localStorage.getItem('the_lab_visitor_runs_v2');
      const now = Date.now();
      const runs: number[] = raw ? JSON.parse(raw) : [];
      const recent = runs.filter((t) => now - t < 3600000);
      return recent.length < 20;
    } catch {
      return true;
    }
  };

  const recordVisitorRun = () => {
    try {
      const raw = localStorage.getItem('the_lab_visitor_runs_v2');
      const now = Date.now();
      const runs: number[] = raw ? JSON.parse(raw) : [];
      const recent = runs.filter((t) => now - t < 3600000);
      recent.push(now);
      localStorage.setItem('the_lab_visitor_runs_v2', JSON.stringify(recent));
    } catch {
      // Ignore quota
    }
  };

  // Run pipeline
  const handleRunPipeline = async () => {
    if (!selectedStory || isRunning) return;

    // Check visitor limit ONLY if NOT in admin or preview bypass mode
    if (!isAdmin && !checkVisitorLimit()) {
      setRateLimitNotice(
        "The demo is busy right now. Here's the version without rules."
      );
      return;
    }

    setErrorMessage(null);
    setRunError(null);
    setRateLimitNotice(null);
    setIsRunning(true);
    setProgressPhase('facts');
    setElapsedSeconds(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTs = Date.now();
    timerIntervalRef.current = window.setInterval(() => {
      const secs = Math.floor((Date.now() - startTs) / 1000);
      setElapsedSeconds(secs);
      if (secs >= 6) {
        setProgressPhase('writing');
      }
    }, 1000);

    try {
      const endpoint = isAdmin ? '/api/pipeline/run?admin=1' : '/api/pipeline/run';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAdmin ? { 'x-admin-bypass': '1' } : {}),
        },
        body: JSON.stringify({
          eventId: selectedStory.event_id,
          rules,
          admin: isAdmin,
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      // Rate limit check: ONLY when OUR rate limit was actually hit
      if (res.status === 429 && data.ourRateLimitHit) {
        setRateLimitNotice(
          data.message ||
            "The demo is busy right now. Here's the version without rules."
        );
        setIsRunning(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        return;
      }

      // Any other error from Gemini / server: display the real error message with step & status!
      if (!res.ok || data.error) {
        const statusCode = data.statusCode || res.status || 500;
        const failedStep = (data.failedStep as 'facts' | 'writing' | 'baseline') || (progressPhase === 'writing' ? 'writing' : 'facts');
        const msg = data.message || data.details || (typeof data.error === 'string' ? data.error : res.statusText) || 'Unknown error';
        
        const errObj: RunErrorInfo = {
          step: failedStep,
          statusCode,
          message: msg,
        };
        setRunError(errObj);
        setErrorMessage(`[${failedStep === 'facts' ? 'Facts analysis (Step 1)' : 'Article writing (Step 2)'} · HTTP ${statusCode}] ${msg}`);
        return;
      }

      setCustomStep1(data.step1);
      setCustomArticle(data.step2);
      setRunMeta(data.meta);
      setHasCustomRun(true);
      setRunError(null);
      if (!isAdmin) {
        recordVisitorRun();
      }
      setActiveTab('compare');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Run aborted by user.');
      } else {
        const realErrorText = err instanceof Error ? err.message : String(err);
        console.error('Pipeline error:', realErrorText);
        setErrorMessage(realErrorText);
        setRunError({
          step: progressPhase === 'writing' ? 'writing' : 'facts',
          statusCode: 500,
          message: realErrorText,
        });
      }
    } finally {
      setIsRunning(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      abortControllerRef.current = null;
    }
  };

  const handleStopRun = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // Automated checks calculation
  const checks: CheckItem[] = useMemo(() => {
    const targetArticle = hasCustomRun && customArticle ? customArticle : baselineArticle;
    const targetStep1 = hasCustomRun && customStep1 ? customStep1 : baselineStep1;
    if (!targetArticle || !targetStep1) return [];

    return runArticleChecks(targetArticle, rules, targetStep1, sources);
  }, [hasCustomRun, customArticle, baselineArticle, customStep1, baselineStep1, rules, sources]);

  const checkFailCount = checks.filter((c) => c.status === 'fail').length;
  const checkWarnCount = checks.filter((c) => c.status === 'warn').length;

  const { totalCount: totalRuleChanges } = countRuleChanges(rules);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <Header
        isSampleStories={isSampleStories}
        onRefreshStories={() => loadStories(true)}
        isRefreshing={isLoadingStories}
        isAdmin={isAdmin}
      />

      {/* Supabase Error Banner: Displayed when live Supabase feed request fails */}
      {supabaseError && (
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-rose-50 border border-rose-200/90 text-rose-900 px-4 py-2.5 rounded-md shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold text-rose-950">Supabase Connection Notice: </span>
                <span className="font-mono text-[11px] text-rose-800 break-all">{supabaseError}</span>
                <span className="text-neutral-500 ml-1.5">(Showing bundled sample stories as fallback)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => loadStories(true)}
                disabled={isLoadingStories}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded transition-colors cursor-pointer shadow-2xs"
              >
                {isLoadingStories ? 'Retrying...' : 'Retry Supabase connection'}
              </button>
              <button
                type="button"
                onClick={() => setSupabaseError(null)}
                className="text-neutral-400 hover:text-neutral-600 px-1 py-0.5 text-xs font-bold cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6 items-start">
          {/* ============================================================== */}
          {/* LEFT COLUMN: 440px wide, three numbered steps */}
          {/* ============================================================== */}
          <section className="bg-white rounded-md border border-neutral-200/90 shadow-xs p-5 space-y-6 flex flex-col">
            {/* Step 1 · Pick a story */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Pick a story
                </h2>
              </div>

              <StoryPicker
                stories={stories}
                selectedStory={selectedStory}
                onSelectStory={(story) => setSelectedStory(story)}
                onOpenSourcesDrawer={() => setIsSourcesDrawerOpen(true)}
                isLoading={isLoadingStories}
                sourceCount={sources.length}
              />
            </div>

            {/* Step 2 · Change the rules */}
            <div className="space-y-3 pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Change the rules
                </h2>
              </div>

              <RulesPanel
                rules={rules}
                onChangeRules={handleRulesChange}
                disabled={isRunning}
              />
            </div>

            {/* Step 3 · Write this story (Pinned to bottom of column) */}
            <div className="space-y-3 pt-4 border-t border-neutral-200/80 sticky bottom-4 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Write this story
                </h2>
              </div>

              {/* Progress Line while running */}
              {isRunning && (
                <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs text-neutral-800 space-y-1.5 animate-pulse">
                  <div className="flex items-center justify-between text-[11px] font-medium text-neutral-600">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-neutral-900 animate-spin" />
                      {progressPhase === 'facts'
                        ? `Finding the facts in ${sources.length || 9} sources… ${elapsedSeconds}s`
                        : `Writing the article with your rules… ${elapsedSeconds}s`}
                    </span>
                    <Clock className="w-3 h-3 text-neutral-400" />
                  </div>
                  <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-900 h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.min(95, Math.max(10, elapsedSeconds * 5))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Main action button: "Write this story" or "Stop" */}
              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStopRun}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-3 px-4 rounded-md transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop generation</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRunPipeline}
                  disabled={!selectedStory}
                  className="w-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold py-3 px-4 rounded-md transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Write this story</span>
                </button>
              )}

              {/* Rate limit notification */}
              {rateLimitNotice && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{rateLimitNotice}</span>
                    <span className="text-[11px] text-amber-800">
                      Standard baseline is displayed in full on the right.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: Tabs (Compare | Facts found | Checks | Phone preview) */}
          {/* ============================================================== */}
          <section className="space-y-4 min-w-0">
            {/* Story Context Banner before/after run */}
            <div className="bg-white rounded-md border border-neutral-200 p-4 shadow-xs flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                    Active Story Investigation
                  </span>
                  <h2 className="text-sm font-bold text-neutral-950 truncate leading-snug">
                    {selectedStory?.title || 'Select a story'}
                  </h2>
                </div>

                {/* Tabs navigation */}
                <div className="flex items-center gap-1 bg-neutral-100/80 p-1 rounded-md text-xs self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('compare')}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      activeTab === 'compare'
                        ? 'bg-white text-neutral-950 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    Compare
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('facts')}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      activeTab === 'facts'
                        ? 'bg-white text-neutral-950 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    Facts found
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('checks')}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'checks'
                        ? 'bg-white text-neutral-950 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    <span>Checks</span>
                    {checkFailCount > 0 ? (
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {checkFailCount}
                      </span>
                    ) : checkWarnCount > 0 ? (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {checkWarnCount}
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('phone')}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      activeTab === 'phone'
                        ? 'bg-white text-neutral-950 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    Phone preview
                  </button>
                </div>
              </div>

              {/* Hint lines before any run OR Meta line after run */}
              {!hasCustomRun ? (
                <div className="pt-1 text-xs text-neutral-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1 text-neutral-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                    1. Pick a story
                  </span>
                  <span className="inline-flex items-center gap-1 text-neutral-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                    2. Change a rule, e.g. add a word to never use
                  </span>
                  <span className="inline-flex items-center gap-1 text-neutral-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                    3. Press Write this story
                  </span>
                </div>
              ) : (
                <div className="pt-1 flex items-center justify-between text-xs text-neutral-600 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-neutral-900">
                      {runMeta?.outletCount || sources.length} outlets
                    </span>
                    <span>·</span>
                    <span>{runMeta?.durationSeconds || elapsedSeconds}s</span>
                    <span>·</span>
                    <span className="text-neutral-700 font-medium">
                      {runMeta?.rulesUsedSummary || 'Rules applied'}
                    </span>

                    {/* Show models used (always in admin or when custom run has meta) */}
                    {(isAdmin || runMeta?.step1Model) && (
                      <>
                        <span>·</span>
                        <span className="text-neutral-500 font-mono text-[11px] bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                          Step 1: {runMeta?.step1Model || 'gemini-3.8-flash'} · Step 2: {runMeta?.step2Model || 'gemini-3.8-flash'}
                        </span>
                      </>
                    )}

                    {/* Small note 'Using Flash' if Pro model fell back */}
                    {runMeta?.usingFlashFallback && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                        Using Flash
                      </span>
                    )}
                  </div>

                  {runMeta?.cached && (
                    <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                      cached
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Error Message Card with Real Gemini Status and Message */}
            {errorMessage && (
              <div className="bg-white rounded-md border border-rose-300 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-rose-950">
                      Gemini Execution Error
                    </h4>
                    <p className="text-xs font-mono text-rose-800 bg-rose-50/80 px-2.5 py-1.5 rounded border border-rose-200 break-all select-text">
                      {errorMessage}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRunPipeline}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors shadow-xs cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try again</span>
                </button>
              </div>
            )}

            {/* Tab 1: Compare */}
            {activeTab === 'compare' && (
              <CompareTab
                baselineArticle={baselineArticle}
                customArticle={customArticle}
                hasCustomRun={hasCustomRun}
                totalRuleChanges={totalRuleChanges}
                isLoadingBaseline={isLoadingBaseline}
                baselineMeta={baselineMeta}
                customMeta={runMeta}
                runError={runError}
                baselineError={baselineError}
                onRetry={handleRunPipeline}
              />
            )}

            {/* Tab 2: Facts found */}
            {activeTab === 'facts' && (
              <FactsFoundTab
                step1={hasCustomRun && customStep1 ? customStep1 : baselineStep1}
                isLoading={isLoadingBaseline && !hasCustomRun}
              />
            )}

            {/* Tab 3: Checks */}
            {activeTab === 'checks' && (
              <ChecksTab checks={checks} hasCustomRun={hasCustomRun} />
            )}

            {/* Tab 4: Phone preview */}
            {activeTab === 'phone' && (
              <PhonePreviewTab
                baselineArticle={baselineArticle}
                customArticle={customArticle}
                hasCustomRun={hasCustomRun}
                story={selectedStory}
                sources={sources}
                step1={hasCustomRun && customStep1 ? customStep1 : baselineStep1}
              />
            )}
          </section>
        </div>
      </main>

      {/* Sources Drawer slide-over */}
      <SourcesDrawer
        isOpen={isSourcesDrawerOpen}
        onClose={() => setIsSourcesDrawerOpen(false)}
        storyTitle={selectedStory?.title || ''}
        sources={sources}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
