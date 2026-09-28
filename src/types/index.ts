export interface StoryEvent {
  id: string;
  title: string;
  topic: string;
  scope: string;
}

export interface Story {
  id: string;
  event_id: string;
  title: string;
  standfirst: string;
  article_text: string;
  key_points: string[];
  source_count: number;
  created_at: string;
  image_urls: string[] | null;
  pexels_image_urls: string[] | null;
  events: StoryEvent;
}

export interface SourceArticle {
  id: string;
  source: string;
  canonical_outlet?: string;
  outlet: string;
  title: string;
  summary: string;
  url: string;
  published_at: string;
  country?: string;
  event_id?: string;
}

export interface ClaimItem {
  type: 'consensus' | 'partial_coverage' | 'disputed';
  claim: string;
  status: 'supported' | 'partial' | 'disputed';
  coverage_percentage: number;
  supporting_sources?: string[];
  sources?: string[];
  contradicting_sources?: string[];
  supporting_view?: string;
  contradicting_view?: string;
  views?: Array<{
    position: string;
    sources: string[];
    percentage: number;
  }>;
}

export interface OutletAnalysisItem {
  outlet: string;
  tone: 'neutral' | 'critical' | 'alarmist' | 'supportive' | string;
  bias_indicators: string[];
  emphasis: string[];
}

export interface Step1AnalysisResult {
  event_summary: string;
  key_facts: string[];
  claims: ClaimItem[];
  outlet_analysis: OutletAnalysisItem[];
  success?: boolean;
  reason?: string;
}

export interface TimelineItem {
  date: string;
  description: string;
}

export interface Step2ArticleResult {
  headline: string;
  standfirst: string;
  body: string;
  key_points: string[];
  claims: ClaimItem[];
  timeline: TimelineItem[];
  status: 'developing' | 'breaking' | 'disputed' | 'verified' | string;
}

export type HeadlineRuleType =
  | 'standard'
  | 'newest_fact'
  | 'lead_with_changes'
  | 'very_short'
  | 'custom';

export type ToneRuleType =
  | 'standard'
  | 'conversational'
  | 'crisp_wire'
  | 'energetic'
  | 'explain_context'
  | 'custom';

export type StandfirstRuleType =
  | 'standard'
  | 'one_short_sentence'
  | 'say_why_it_matters'
  | 'custom';

export type OpeningRuleType =
  | 'standard'
  | 'who_what_where_when'
  | 'say_why_it_matters'
  | 'human_impact_first'
  | 'custom';

export type SentenceLengthRuleType =
  | 'standard'
  | 'max_20_words'
  | 'max_15_words'
  | 'custom';

export type ArticleLengthRuleType =
  | 'standard'
  | 'shorter_200_300'
  | 'short_150_220'
  | 'custom';

export type KeyPointsRuleType =
  | 'standard'
  | 'points_4_6'
  | 'points_3_5'
  | 'custom';

export type ConsensusThresholdType =
  | 'standard'
  | 'looser'
  | 'stricter'
  | 'custom';

export type ConsensusCountRuleType =
  | 'standard'
  | 'more_12_16'
  | 'fewer_5_8'
  | 'custom';

export type PartialCoverageRuleType =
  | 'standard'
  | 'stricter'
  | 'broader'
  | 'custom';

export type DisputedClaimsRuleType =
  | 'standard'
  | 'only_clear_conflicts'
  | 'flag_more_number_diffs'
  | 'custom';

export type OutletFramingRuleType =
  | 'standard'
  | 'detailed'
  | 'contrasting_only'
  | 'custom';

export interface RulesState {
  // STEP 2 · Writing the article
  bannedWords: string[];
  headlineRule: HeadlineRuleType;
  headlineCustomText: string;
  toneRule: ToneRuleType;
  toneCustomText: string;
  standfirstRule: StandfirstRuleType;
  standfirstCustomText: string;
  openingRule: OpeningRuleType;
  openingCustomText: string;
  sentenceLengthRule: SentenceLengthRuleType;
  sentenceLengthCustomText: string;
  articleLengthRule: ArticleLengthRuleType;
  articleLengthCustomText: string;
  keyPointsRule: KeyPointsRuleType;
  keyPointsCustomText: string;
  customWritingRules: string[];

  // STEP 1 · Finding the facts
  consensusThreshold: ConsensusThresholdType;
  consensusThresholdCustomText: string;
  consensusCountRule: ConsensusCountRuleType;
  consensusCountCustomText: string;
  partialCoverageRule: PartialCoverageRuleType;
  partialCoverageCustomText: string;
  disputedClaimsRule: DisputedClaimsRuleType;
  disputedClaimsCustomText: string;
  outletFramingRule: OutletFramingRuleType;
  outletFramingCustomText: string;
}

export interface CheckItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface PipelineExecutionMeta {
  outletCount: number;
  durationSeconds: number;
  cached: boolean;
  rulesUsedSummary: string;
  step1Model?: string;
  step2Model?: string;
  modelUsed?: string;
  writtenAt?: string;
  usingFlashFallback?: boolean;
}

export interface RunArticleResponse {
  step1: Step1AnalysisResult;
  step2: Step2ArticleResult;
  meta: PipelineExecutionMeta;
  isBaseline?: boolean;
}

export interface RunErrorInfo {
  step: 'facts' | 'writing' | 'baseline' | string;
  statusCode: number;
  message: string;
}
