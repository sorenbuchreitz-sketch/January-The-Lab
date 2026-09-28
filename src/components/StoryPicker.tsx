import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Story } from '../types';
import { ChevronDown, Search, ExternalLink, Newspaper, Check } from 'lucide-react';

interface StoryPickerProps {
  stories: Story[];
  selectedStory: Story | null;
  onSelectStory: (story: Story) => void;
  onOpenSourcesDrawer: () => void;
  isLoading: boolean;
  sourceCount: number;
}

function getStoryTopic(story: Story | null | undefined): string {
  if (!story) return 'News';
  if (Array.isArray(story.events)) {
    return (story.events as unknown as Array<{ topic?: string }>)[0]?.topic || 'News';
  }
  return story.events?.topic || 'News';
}

function formatTimeAgo(isoString: string | undefined): string {
  if (!isoString) return 'recently';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'just now';
    if (diffHours === 1) return '1h ago';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
}

export const StoryPicker: React.FC<StoryPickerProps> = ({
  stories = [],
  selectedStory,
  onSelectStory,
  onOpenSourcesDrawer,
  isLoading,
  sourceCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s) => {
      const topic = getStoryTopic(s);
      if (topic) set.add(topic.charAt(0).toUpperCase() + topic.slice(1));
    });
    return ['All', ...Array.from(set)];
  }, [stories]);

  // Filtered stories
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const topic = getStoryTopic(story).toLowerCase();
      const matchesCategory =
        activeCategory === 'All' ||
        topic === activeCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (story.title || '').toLowerCase().includes(q) ||
        topic.includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [stories, activeCategory, searchQuery]);

  return (
    <div className="space-y-2.5">
      {/* Searchable Dropdown Button */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left bg-white border border-neutral-200/90 rounded-md p-3 transition-all shadow-xs hover:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-400 ${
            isOpen ? 'ring-1 ring-neutral-900 border-neutral-900' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                  {getStoryTopic(selectedStory)}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {selectedStory ? formatTimeAgo(selectedStory.created_at) : ''}
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-900 line-clamp-2 leading-relaxed">
                {selectedStory ? selectedStory.title : 'Select a story to analyze...'}
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-neutral-400 transition-transform mt-1 shrink-0 ${
                isOpen ? 'rotate-180 text-neutral-800' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-md shadow-lg z-30 max-h-[380px] flex flex-col overflow-hidden">
            {/* Search Box */}
            <div className="p-2 border-b border-neutral-100 bg-neutral-50/50">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 20 live stories..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-200 rounded focus:outline-none focus:border-neutral-400"
                  autoFocus
                />
              </div>

              {/* Category Filter Chips */}
              {categories.length > 1 && (
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                        activeCategory === cat
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto divide-y divide-neutral-100 flex-1">
              {filteredStories.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400">
                  No stories match your search.
                </div>
              ) : (
                filteredStories.map((story) => {
                  const isSelected = selectedStory?.id === story.id;
                  const topic = getStoryTopic(story);
                  return (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => {
                        onSelectStory(story);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-3 text-xs transition-colors flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-neutral-50 hover:bg-neutral-100/70'
                          : 'hover:bg-neutral-50/70'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500 bg-neutral-100 px-1 py-0.2 rounded">
                            {topic}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {story.source_count} sources · {formatTimeAgo(story.created_at)}
                          </span>
                        </div>
                        <div className="font-medium text-neutral-900 line-clamp-2 leading-snug">
                          {story.title}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Under story picker: "See the sources" link and count */}
      {selectedStory && (
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
            <Newspaper className="w-3.5 h-3.5 text-neutral-400" />
            <span>{sourceCount || selectedStory.source_count || 0} reporting outlets</span>
          </div>

          <button
            type="button"
            onClick={onOpenSourcesDrawer}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-900 hover:text-blue-600 transition-colors underline underline-offset-2 cursor-pointer"
          >
            <span>See the sources</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
