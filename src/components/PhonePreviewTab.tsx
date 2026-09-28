import React from 'react';
import {
  PhonePreview,
  PhoneArticle,
  PhoneClaim,
  PhoneSource,
} from './JanuaryPhonePreview';
import {
  Step1AnalysisResult,
  Step2ArticleResult,
  Story,
  SourceArticle,
} from '../types';

interface PhonePreviewTabProps {
  baselineArticle: Step2ArticleResult | null;
  customArticle: Step2ArticleResult | null;
  hasCustomRun: boolean;
  story: Story | null;
  sources: SourceArticle[];
  step1: Step1AnalysisResult | null;
}

export const PhonePreviewTab: React.FC<PhonePreviewTabProps> = ({
  baselineArticle,
  customArticle,
  hasCustomRun,
  story,
  sources,
  step1,
}) => {
  // Category from story events topic or fallback
  const rawTopic = Array.isArray(story?.events)
    ? (story?.events as unknown as Array<{ topic?: string }>)[0]?.topic
    : story?.events?.topic;
  const category = rawTopic
    ? rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1)
    : 'News';

  // Image URL from story
  const imageUrl =
    story?.pexels_image_urls?.[0] ||
    story?.image_urls?.[0] ||
    null;

  // Photo credit: first source's outlet name
  const photoCredit = sources[0]?.outlet || sources[0]?.source || null;

  // withRules: null before first run
  const withRules: PhoneArticle | null =
    hasCustomRun && customArticle
      ? {
          headline: customArticle.headline,
          standfirst: customArticle.standfirst,
          body: customArticle.body,
          key_points: customArticle.key_points || [],
        }
      : null;

  // withoutRules: baseline article (strictly written by Gemini)
  const withoutRules: PhoneArticle = baselineArticle
    ? {
        headline: baselineArticle.headline,
        standfirst: baselineArticle.standfirst,
        body: baselineArticle.body,
        key_points: baselineArticle.key_points || [],
      }
    : {
        headline: story?.title || 'Generating Gemini baseline…',
        standfirst: 'Writing the version without rules with Gemini…',
        body: 'Writing the version without rules with Gemini… Analyzing sources and drafting objective baseline.',
        key_points: ['Writing the version without rules with Gemini…'],
      };

  // claims: step 1 claims (including partial_coverage and disputed items with views)
  const claims: PhoneClaim[] = (step1?.claims || []).map((c) => {
    let views = c.views;
    if (!views && c.type === 'disputed' && (c.supporting_view || c.contradicting_view)) {
      views = [];
      if (c.supporting_view) {
        views.push({
          position: c.supporting_view,
          sources: c.supporting_sources || c.sources || [],
          percentage: c.coverage_percentage || 50,
        });
      }
      if (c.contradicting_view) {
        views.push({
          position: c.contradicting_view,
          sources: c.contradicting_sources || [],
          percentage: Math.max(0, 100 - (c.coverage_percentage || 50)),
        });
      }
    }

    return {
      type: c.type,
      claim: c.claim,
      coverage_percentage: c.coverage_percentage,
      sources: c.sources,
      supporting_sources: c.supporting_sources,
      contradicting_sources: c.contradicting_sources,
      views,
    };
  });

  // sources: { outlet, title, url, country }
  const phoneSources: PhoneSource[] = sources.map((s) => ({
    outlet: s.outlet || s.source,
    title: s.title || null,
    url: s.url || null,
    country: s.country || null,
  }));

  return (
    <div className="bg-white rounded-md border border-neutral-200/90 shadow-xs p-6 overflow-x-auto">
      <PhonePreview
        category={category}
        imageUrl={imageUrl}
        photoCredit={photoCredit}
        withRules={withRules}
        withoutRules={withoutRules}
        claims={claims}
        sources={phoneSources}
      />
    </div>
  );
};

