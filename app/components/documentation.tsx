'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Database,
  FileText,
  MessageSquare,
  Search,
  Shield,
  Building2,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ArrowUp,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Grid,
  List,
} from 'lucide-react';

interface DocumentationProps {
  theme?: 'light' | 'dark';
}

interface DocSection {
  id: string;
  title: string;
  description: string;
  content: string[];
  icon: React.ReactNode;
  category?: 'getting-started' | 'tools' | 'resources' | 'security';
  tips?: string[];
  relatedLinks?: { label: string; href: string }[];
  updatedAt?: string;
}

const sections: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'Quick guide for using LOT tools.',
    icon: <BookOpen className="h-5 w-5" />,
    category: 'getting-started',
    content: [
      'LOT is a listing operations tool suite designed to streamline your workflow.',
      'It helps process SKUs, check ASIN conflicts, generate Basecamp messages, and retrieve brand information.',
      'Use the sidebar to navigate between different tools.',
      'Dashboard shows tool usage and recent activity counts.',
    ],
    tips: [
      'Use ⌘K (or Ctrl+K) to quickly search and navigate between tools',
      'Enable desktop notifications for real-time updates',
      'Toggle between light and dark mode for comfortable viewing',
    ],
    updatedAt: '2024-01-15',
  },
  {
    id: 'shopkeep',
    title: 'Shopkeep Consolidated Tool',
    description: 'Generate consolidated SKU files.',
    icon: <Database className="h-5 w-5" />,
    category: 'tools',
    content: [
      'Paste SKUs one per line in the input area.',
      'Click "Process" to generate the consolidated export.',
      'The generated file will be downloaded automatically.',
      'Completed files can be viewed in the Downloads section.',
      'Supports batch processing of up to 10,000 SKUs.',
    ],
    tips: [
      'Ensure SKUs are exactly as they appear in your catalog',
      'The tool automatically removes duplicates',
      'Check the Downloads section for historical exports',
    ],
    relatedLinks: [
      { label: 'View Downloads', href: '/downloads' },
      { label: 'SKU Format Guide', href: '#' },
    ],
    updatedAt: '2024-01-10',
  },
  {
    id: 'asin',
    title: 'Multiple Parent ASIN Checker',
    description: 'Check if one style has multiple parent ASINs.',
    icon: <Search className="h-5 w-5" />,
    category: 'tools',
    content: [
      'Paste Style IDs in the left input field.',
      'Paste matching Parent ASINs in the right input field.',
      'Each line should match by row position.',
      'Click "Run Check" to see conflicts.',
      'Export or copy the results if conflicts are found.',
    ],
    tips: [
      'Style IDs and ASINs must be in the same order',
      'The tool highlights potential mismatches',
      'Export results for documentation purposes',
    ],
    relatedLinks: [
      { label: 'ASIN Format Guide', href: '#' },
      { label: 'Conflict Resolution', href: '#' },
    ],
    updatedAt: '2024-01-12',
  },
  {
    id: 'basecamp',
    title: 'Basecamp Response Generator',
    description: 'Generate formatted Basecamp messages.',
    icon: <MessageSquare className="h-5 w-5" />,
    category: 'tools',
    content: [
      'Choose the appropriate message type from the dropdown.',
      'Enter the PO number if available (optional).',
      'Upload the required file (CSV or Excel format).',
      'Click "Generate Message" to create the formatted response.',
      'Copy the generated message and paste it into Basecamp.',
    ],
    tips: [
      'Templates are pre-formatted for consistency',
      'File upload supports .csv, .xlsx, and .xls formats',
      'Review the message before copying to Basecamp',
    ],
    relatedLinks: [
      { label: 'Message Templates', href: '#' },
      { label: 'Basecamp Guide', href: '#' },
    ],
    updatedAt: '2024-01-14',
  },
  {
    id: 'brand',
    title: 'Get Brand',
    description: 'Retrieve brand names from SKU lists.',
    icon: <Building2 className="h-5 w-5" />,
    category: 'tools',
    content: [
      'Upload a CSV or text file containing SKUs (one per line or comma-separated).',
      'Click "Get Brands" to process the SKUs.',
      'The tool will match each SKU to its corresponding brand name from the catalog database.',
      'Results can be downloaded as CSV with SKU and Brand Name columns.',
      'Supports bulk processing of up to 10,000 SKUs per batch.',
      'Coming soon: Integration with Amazon Brand Registry for real-time verification.',
    ],
    tips: [
      'Use the template file for correct format',
      'Brand matching is case-insensitive',
      'Check the results for unmatched SKUs',
    ],
    relatedLinks: [
      { label: 'Download Template', href: '#' },
      { label: 'Brand Database', href: '#' },
    ],
    updatedAt: '2024-01-16',
  },
  {
    id: 'downloads',
    title: 'Downloads',
    description: 'Access generated files.',
    icon: <FileText className="h-5 w-5" />,
    category: 'resources',
    content: [
      'Downloads shows generated export files from all tools including:',
      '• Shopkeep consolidated exports',
      '• ASIN conflict reports',
      '• Basecamp message templates',
      '• Brand lookup results',
      'Use the download button to save the file again.',
      'Use delete only if the file is no longer needed.',
    ],
    tips: [
      'Files are stored for 30 days by default',
      'Search and filter to find specific exports',
      'Use bulk delete to clean up old files',
    ],
    relatedLinks: [
      { label: 'Storage Policy', href: '#' },
      { label: 'File Formats', href: '#' },
    ],
    updatedAt: '2024-01-13',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Basic data handling reminders.',
    icon: <Shield className="h-5 w-5" />,
    category: 'security',
    content: [
      'Use only approved internal data sources.',
      'Do not share generated files with unauthorized users.',
      'Clear inputs when finished with sensitive data.',
      'Brand information is retrieved from trusted internal catalog sources.',
      'Report unexpected errors to the administrator immediately.',
      'Maintain proper access controls and authentication.',
    ],
    tips: [
      'Always sign out when using shared devices',
      'Use strong passwords and enable 2FA',
      'Regularly review your access permissions',
    ],
    relatedLinks: [
      { label: 'Security Policy', href: '#' },
      { label: 'Report Issue', href: '#' },
    ],
    updatedAt: '2024-01-17',
  },
];

export default function Documentation({ theme = 'dark' }: DocumentationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const contentRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  // Category labels
  const categoryLabels: Record<string, string> = {
    'getting-started': 'Getting Started',
    'tools': 'Tools',
    'resources': 'Resources',
    'security': 'Security & Privacy',
  };

  // Category colors
  const categoryColors: Record<string, string> = {
    'getting-started': isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700',
    'tools': isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700',
    'resources': isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700',
    'security': isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700',
  };

  // Group sections by category for sidebar
  const groupedSections = useMemo(() => {
    const groups: Record<string, DocSection[]> = {};
    sections.forEach(section => {
      const category = section.category || 'tools';
      if (!groups[category]) groups[category] = [];
      groups[category].push(section);
    });
    return groups;
  }, []);

  const filteredSections = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sections;

    return sections.filter((section) => {
      const searchableText = [
        section.title,
        section.description,
        ...section.content,
        ...(section.tips || []),
        ...(section.relatedLinks?.map(l => l.label) || []),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [searchTerm]);

  const selectedSection = useMemo(() => {
    if (searchTerm.trim()) {
      return filteredSections[0] ?? null;
    }
    return sections.find((section) => section.id === activeSection) ?? sections[0];
  }, [activeSection, filteredSections, searchTerm]);

  // Handle scroll events for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setShowScrollTop(contentRef.current.scrollTop > 200);
      }
    };
    const element = contentRef.current;
    element?.addEventListener('scroll', handleScroll);
    return () => element?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const cardClass = isDark
    ? 'border-slate-700/50 bg-slate-900/60'
    : 'border-gray-200 bg-white';

  const panelClass = isDark
    ? 'border-slate-700/50 bg-slate-900/70'
    : 'border-gray-200 bg-white';

  const pageText = isDark ? 'text-white' : 'text-gray-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={`text-xl font-bold sm:text-2xl ${pageText}`}>
              Documentation
            </h1>
            <p className={`mt-1 text-sm ${mutedText}`}>
              Comprehensive guide for using the LOT tools.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className={`hidden sm:flex items-center gap-0.5 rounded-lg border p-0.5 ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'list'
                    ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'grid'
                    ? isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                }`}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile sidebar toggle */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`lg:hidden rounded-lg border p-2 transition-colors ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search
            className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
              isDark ? 'text-slate-400' : 'text-gray-400'
            }`}
          />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={`w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/70 ${
              isDark
                ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
            }`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick search results count */}
        {searchTerm && (
          <p className={`mt-2 text-sm ${mutedText}`}>
            Found {filteredSections.length} result{filteredSections.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Main Layout */}
      <div className="relative grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr] lg:gap-6">
        {/* Sidebar - Desktop */}
        <aside className={`hidden lg:block min-w-0 overflow-hidden rounded-xl border ${cardClass}`}>
          <div className={`border-b p-4 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Contents
            </h3>
          </div>

          <div className="max-h-[32rem] overflow-y-auto p-3">
            {Object.entries(groupedSections).map(([category, sections]) => (
              <div key={category} className="mb-4 last:mb-0">
                <div className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
                  {categoryLabels[category] || category}
                </div>
                <div className="space-y-1">
                  {sections.map((section) => {
                    const active = !searchTerm.trim() && activeSection === section.id;
                    const isSearchMatch = searchTerm.trim() && filteredSections.includes(section);
                    
                    if (searchTerm.trim() && !isSearchMatch) return null;

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setActiveSection(section.id);
                          setSearchTerm('');
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
                          active
                            ? isDark
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10'
                            : isDark
                              ? 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:border-slate-700/50'
                              : 'border-transparent text-gray-700 hover:bg-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className={`flex-shrink-0 transition-colors ${
                          active ? 'text-emerald-400' : isDark ? 'text-slate-500' : 'text-gray-400'
                        }`}>
                          {section.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {section.title}
                        </span>
                        {active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Mobile Sidebar - Overlay */}
        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <aside className={`fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] overflow-y-auto rounded-r-xl border shadow-2xl lg:hidden ${
              isDark ? 'border-slate-700/50 bg-slate-900' : 'border-gray-200 bg-white'
            }`}>
              <div className={`sticky top-0 z-10 flex items-center justify-between border-b p-4 ${
                isDark ? 'border-slate-700/50 bg-slate-900/95' : 'border-gray-200 bg-white/95'
              }`}>
                <h3 className={`text-sm font-semibold ${pageText}`}>Documentation</h3>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`rounded-lg p-1 transition-colors ${
                    isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3">
                {Object.entries(groupedSections).map(([category, sections]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
                      {categoryLabels[category] || category}
                    </div>
                    <div className="space-y-1">
                      {sections.map((section) => {
                        const active = !searchTerm.trim() && activeSection === section.id;
                        return (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => {
                              setActiveSection(section.id);
                              setSearchTerm('');
                              setIsSidebarOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                              active
                                ? isDark
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : isDark
                                  ? 'border-transparent text-slate-300 hover:bg-slate-800/60'
                                  : 'border-transparent text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className="flex-shrink-0">{section.icon}</span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {section.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}

        {/* Content */}
        <main
          ref={contentRef}
          className={`relative min-h-[24rem] overflow-y-auto rounded-xl border ${panelClass}`}
        >
          {searchTerm.trim() && (
            <div
              className={`sticky top-0 z-10 border-b px-4 py-3 text-sm backdrop-blur-md sm:px-6 ${
                isDark
                  ? 'border-slate-700/50 bg-slate-900/80 text-slate-300'
                  : 'border-gray-200 bg-white/80 text-gray-700'
              }`}
            >
              {filteredSections.length > 0 ? (
                <>
                  Showing {filteredSections.length} result
                  {filteredSections.length !== 1 ? 's' : ''} for{' '}
                  <span className="font-semibold text-emerald-500">
                    “{searchTerm}”
                  </span>
                </>
              ) : (
                <>
                  No results found for{' '}
                  <span className="font-semibold text-emerald-500">
                    “{searchTerm}”
                  </span>
                </>
              )}
            </div>
          )}

          {selectedSection ? (
            <article className="p-4 sm:p-6">
              {/* Header */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                    isDark
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {selectedSection.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`break-words text-xl font-bold sm:text-2xl ${pageText}`}>
                      {selectedSection.title}
                    </h2>
                    {selectedSection.category && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[selectedSection.category]}`}>
                        {categoryLabels[selectedSection.category] || selectedSection.category}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-sm ${mutedText}`}>
                    {selectedSection.description}
                  </p>
                  {selectedSection.updatedAt && (
                    <p className={`mt-2 text-xs ${mutedText}`}>
                      Last updated: {new Date(selectedSection.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Copy section link */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(
                    `${selectedSection.title}\n\n${selectedSection.content.join('\n')}`,
                    selectedSection.id
                  )}
                  className={`flex-shrink-0 rounded-lg border px-3 py-2 text-xs transition-colors ${
                    isDark
                      ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {copiedId === selectedSection.id ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" />
                      Copy section
                    </span>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Main content */}
                <div className="space-y-4">
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    How to use
                  </h3>
                  <ul className={`space-y-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {selectedSection.content.map((item, index) => (
                      <li key={index} className="flex gap-3">
                        <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                          item.startsWith('•') ? 'bg-slate-500' : 'bg-emerald-500'
                        }`} />
                        <span className="min-w-0 break-words">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tips section */}
                {selectedSection.tips && selectedSection.tips.length > 0 && (
                  <div className={`rounded-xl border p-4 ${
                    isDark
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-amber-300/30 bg-amber-50/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className={`h-4 w-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <h4 className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                        Pro Tips
                      </h4>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {selectedSection.tips.map((tip, index) => (
                        <li key={index} className={`flex gap-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                          <CheckCircle2 className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                            isDark ? 'text-amber-400' : 'text-amber-600'
                          }`} />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Related links */}
                {selectedSection.relatedLinks && selectedSection.relatedLinks.length > 0 && (
                  <div>
                    <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Related Resources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSection.relatedLinks.map((link, index) => (
                        <a
                          key={index}
                          href={link.href}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                            isDark
                              ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <Link2 className="h-3 w-3" />
                          {link.label}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Other matching sections - Only when searching */}
              {searchTerm.trim() && filteredSections.length > 1 && (
                <div className="mt-8 pt-6 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}">
                  <h3 className={`mb-4 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Other matching sections
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filteredSections
                      .filter((section) => section.id !== selectedSection.id)
                      .slice(0, 4)
                      .map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => {
                            setActiveSection(section.id);
                            setSearchTerm('');
                          }}
                          className={`rounded-lg border p-4 text-left transition-all hover:shadow-lg ${
                            isDark
                              ? 'border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2 text-emerald-500">
                            <span className="flex-shrink-0">{section.icon}</span>
                            <span className="truncate text-sm font-semibold">
                              {section.title}
                            </span>
                          </div>
                          <p className={`line-clamp-2 text-xs ${mutedText}`}>
                            {section.description}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </article>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center px-4 text-center">
              <Search
                className={`mb-4 h-12 w-12 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
              />
              <p className={`font-medium ${mutedText}`}>No results found</p>
              <p className={`mt-1 max-w-sm text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                Try adjusting your search terms or browse the documentation sections.
              </p>
            </div>
          )}

          {/* Scroll to top button */}
          {showScrollTop && (
            <button
              type="button"
              onClick={scrollToTop}
              className={`fixed bottom-4 right-4 z-20 rounded-full border p-2 shadow-lg transition-all hover:scale-110 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                  : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-100'
              }`}
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          )}
        </main>
      </div>

      {/* Footer */}
      <div
        className={`mt-6 border-t pt-4 text-center ${
          isDark ? 'border-slate-700/50' : 'border-gray-200'
        }`}
      >
        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          For additional help, contact your administrator.
        </p>
      </div>
    </div>
  );
}