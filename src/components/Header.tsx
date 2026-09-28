import React from 'react';
import { FlaskConical, RefreshCw } from 'lucide-react';

interface HeaderProps {
  isSampleStories: boolean;
  onRefreshStories?: () => void;
  isRefreshing?: boolean;
  isAdmin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isSampleStories,
  onRefreshStories,
  isRefreshing = false,
  isAdmin = false,
}) => {
  return (
    <header className="border-b border-neutral-200/80 bg-white px-6 py-4">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="https://neutral-lens-digest.vercel.app/january-jdot-black.png"
              alt="January"
              className="h-[40px] w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-neutral-950 tracking-tight flex items-center gap-1.5">
                The Lab <span className="text-neutral-400 font-normal">by January</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/60">
                <FlaskConical className="w-2.5 h-2.5 mr-1 text-neutral-500" />
                Editorial Engine
              </span>

              {/* Status Badge: Live Feed vs Sample Stories */}
              {!isSampleStories ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live feed
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                  Showing sample stories
                </span>
              )}

              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                  Admin (?admin=1) · Bypass Active
                </span>
              )}

              {onRefreshStories && (
                <button
                  type="button"
                  onClick={onRefreshStories}
                  disabled={isRefreshing}
                  title="Refresh feed from Supabase"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200/80 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin text-neutral-900' : ''}`}
                  />
                  <span>Sync</span>
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              See how January writes neutral news from many sources. Change a rule and watch the article change.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right hidden md:block">
            <div className="text-[11px] font-medium text-neutral-800">Neutral News Synthesis</div>
            <div className="text-[10px] text-neutral-400">Consensus fact-checking · Multi-outlet audit</div>
          </div>
        </div>
      </div>
    </header>
  );
};
