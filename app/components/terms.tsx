'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Mail,
  Scale,
  Shield,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ArrowUp,
  Clock,
  BookOpen,
  Users,
  Lock,
  Eye,
  Download,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface TermsProps {
  theme?: 'light' | 'dark';
}

interface TermsSection {
  id: string;
  title: string;
  summary: string;
  icon: React.ReactNode;
  items: string[];
  subItems?: string[];
  cautionNote?: string;
}

const LAST_UPDATED = 'April 29, 2026';
const NEXT_REVIEW = 'July 29, 2026';

const sections: TermsSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    summary: 'Using LOT means you agree to these basic terms.',
    icon: <CheckCircle className="h-5 w-5" />,
    items: [
      'Use LOT only for approved listing operations work.',
      'Do not use the tools if you do not agree with these terms.',
      'Terms may be updated when needed with prior notice.',
      'Continued use constitutes acceptance of any updates.',
    ],
    cautionNote: 'If you disagree with any part of these terms, please discontinue use immediately.',
  },
  {
    id: 'use-of-tools',
    title: 'Responsible Use',
    summary: 'Use LOT responsibly and only for business purposes.',
    icon: <Scale className="h-5 w-5" />,
    items: [
      'Use the tools for SKU processing, ASIN checking, downloads, and Basecamp message generation.',
      'Do not upload harmful, unauthorized, or corrupted files.',
      'Do not try to bypass, disrupt, or misuse the tools.',
      'Do not share access with unauthorized users.',
      'Report any security vulnerabilities or suspicious activity immediately.',
    ],
    subItems: [
      'Violations may result in immediate termination of access.',
      'All usage is logged and monitored for compliance.',
    ],
    cautionNote: 'Misuse of tools will be reported to management and may result in disciplinary action.',
  },
  {
    id: 'data',
    title: 'Data Handling & Privacy',
    summary: 'Users are responsible for the data they upload and export.',
    icon: <Shield className="h-5 w-5" />,
    items: [
      'Review files before uploading or downloading.',
      'Clear sensitive input data after use when needed.',
      'Store exported files securely and delete when no longer needed.',
      'Only process data you are authorized to use.',
      'Do not upload personally identifiable information (PII) unless absolutely necessary.',
      'Data is retained for 30 days for operational purposes.',
    ],
    subItems: [
      'Data is encrypted in transit and at rest.',
      'Access logs are maintained for audit purposes.',
    ],
    cautionNote: 'Never upload customer payment information, passwords, or other highly sensitive data.',
  },
  {
    id: 'ownership',
    title: 'Intellectual Property',
    summary: 'LOT and its content belong to the company or authorized owners.',
    icon: <FileText className="h-5 w-5" />,
    items: [
      'Do not copy, resell, or redistribute the tools.',
      'Do not remove ownership notices.',
      'Do not reuse the interface, workflows, or documentation without permission.',
      'All generated outputs remain property of the company.',
      'Proprietary algorithms and methodologies are protected.',
    ],
    cautionNote: 'Unauthorized distribution of tool outputs or methodologies is strictly prohibited.',
  },
  {
    id: 'accuracy',
    title: 'Accuracy & Reliability',
    summary: 'LOT helps with work, but users must still review results.',
    icon: <AlertCircle className="h-5 w-5" />,
    items: [
      'Tool outputs should be reviewed before business use.',
      'LOT does not guarantee that all results are perfect.',
      'Users are responsible for validating exports, messages, and reports.',
      'Data matching accuracy depends on input quality.',
      'Always verify critical business decisions independently.',
    ],
    subItems: [
      'The tool is provided "as-is" without warranties.',
      'Support is available for technical issues only.',
    ],
    cautionNote: 'Business decisions should never rely solely on automated tool outputs.',
  },
  {
    id: 'support',
    title: 'Support & Reporting',
    summary: 'Report issues through your approved internal support channel.',
    icon: <Mail className="h-5 w-5" />,
    items: [
      'Contact your administrator for access or technical issues.',
      'Include screenshots and error messages when reporting problems.',
      'Do not include confidential data unless approved.',
      'Provide detailed steps to reproduce the issue.',
      'Check documentation before submitting support tickets.',
    ],
    subItems: [
      'Critical issues will be prioritized for immediate resolution.',
      'Feature requests are reviewed based on business needs.',
    ],
    cautionNote: 'Always use official support channels. Do not share issues in public forums.',
  },
];

export default function Terms({ theme = 'dark' }: TermsProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgedAll, setAcknowledgedAll] = useState(false);
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  const activeSectionData = useMemo(() => {
    return sections.find((section) => section.id === activeSection) ?? sections[0];
  }, [activeSection]);

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

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleAcknowledgeAll = () => {
    setAcknowledgedAll(true);
    setAcknowledged(true);
  };

  const handleReset = () => {
    setAcknowledged(false);
    setAcknowledgedAll(false);
  };

  const cardClass = isDark
    ? 'border-slate-700/50 bg-slate-900/60'
    : 'border-gray-200 bg-white';

  const sectionClass = isDark
    ? 'border-slate-700/50 bg-slate-800/30'
    : 'border-gray-200 bg-gray-50';

  const strongTextClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-gray-500';

  const sectionColors = {
    acceptance: isDark ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-700',
    'use-of-tools': isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-blue-300 bg-blue-50 text-blue-700',
    data: isDark ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 'border-purple-300 bg-purple-50 text-purple-700',
    ownership: isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-amber-300 bg-amber-50 text-amber-700',
    accuracy: isDark ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' : 'border-orange-300 bg-orange-50 text-orange-700',
    support: isDark ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-cyan-300 bg-cyan-50 text-cyan-700',
  };

  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={`text-xl font-bold sm:text-2xl ${strongTextClass}`}>
              Terms & Conditions
            </h1>
            <div className={`mt-1 flex flex-wrap items-center gap-3 text-sm ${mutedTextClass}`}>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Last updated: {LAST_UPDATED}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Next review: {NEXT_REVIEW}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Acknowledgment status */}
            <div className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              acknowledgedAll
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-emerald-100 text-emerald-700'
                : isDark
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-yellow-100 text-yellow-700'
            }`}>
              {acknowledgedAll ? (
                <Check className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {acknowledgedAll ? 'All accepted' : 'Pending acknowledgment'}
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

        {/* Status Banner */}
        <div
          className={`mt-4 rounded-xl border p-4 transition-colors ${
            acknowledgedAll
              ? isDark
                ? 'border-emerald-500/30 bg-emerald-600/10 text-emerald-400'
                : 'border-emerald-300 bg-emerald-100 text-emerald-800'
              : isDark
                ? 'border-yellow-500/30 bg-yellow-600/10 text-yellow-400'
                : 'border-yellow-300 bg-yellow-100 text-yellow-800'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {acknowledgedAll ? (
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {acknowledgedAll ? 'All terms acknowledged' : 'Please review the terms'}
                </p>
                <p className={`mt-1 text-xs leading-5 opacity-90 ${
                  acknowledgedAll ? '' : 'sm:block'
                }`}>
                  {acknowledgedAll
                    ? 'You have acknowledged all terms for this session.'
                    : 'Review each section and acknowledge the terms to continue.'}
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {!acknowledgedAll && (
                <button
                  type="button"
                  onClick={handleAcknowledgeAll}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    isDark
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Accept All
                </button>
              )}
              {acknowledgedAll && (
                <button
                  type="button"
                  onClick={handleReset}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    isDark
                      ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="relative grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr] lg:gap-6">
        {/* Sidebar - Desktop */}
        <aside className={`hidden lg:block min-w-0 overflow-hidden rounded-xl border ${cardClass}`}>
          <div className={`border-b p-4 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Sections
            </h3>
          </div>

          <div className="max-h-[32rem] overflow-y-auto p-3">
            {sections.map((section) => {
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
                    active
                      ? isDark
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10'
                      : isDark
                        ? 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:border-slate-700/50'
                        : 'border-transparent text-gray-700 hover:bg-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className={`mt-0.5 flex-shrink-0 transition-colors ${
                    active ? 'text-emerald-400' : isDark ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    {section.icon}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${
                      active ? 'text-emerald-400' : ''
                    }`}>
                      {section.title}
                    </span>
                    <span className={`mt-0.5 line-clamp-2 block text-xs ${mutedTextClass}`}>
                      {section.summary}
                    </span>
                  </span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
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
                <h3 className={`text-sm font-semibold ${strongTextClass}`}>Sections</h3>
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
                {sections.map((section) => {
                  const active = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(section.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                        active
                          ? isDark
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : isDark
                            ? 'border-transparent text-slate-300 hover:bg-slate-800/60'
                            : 'border-transparent text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0">{section.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{section.title}</span>
                        <span className={`mt-0.5 line-clamp-2 block text-xs ${mutedTextClass}`}>
                          {section.summary}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </>
        )}

        {/* Content */}
        <main
          ref={contentRef}
          className={`relative min-h-[28rem] overflow-y-auto rounded-xl border ${cardClass}`}
        >
          <article className="p-4 sm:p-6">
            <div className={`rounded-xl border p-4 sm:p-6 ${sectionClass}`}>
              {/* Section Header */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                    isDark
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {activeSectionData.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`break-words text-xl font-bold sm:text-2xl ${strongTextClass}`}>
                      {activeSectionData.title}
                    </h2>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      sectionColors[activeSectionData.id as keyof typeof sectionColors] || sectionColors.acceptance
                    }`}>
                      Section {sections.findIndex(s => s.id === activeSectionData.id) + 1}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>
                    {activeSectionData.summary}
                  </p>
                </div>
              </div>

              {/* Main Content */}
              <div className="space-y-4">
                <ul className={`space-y-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {activeSectionData.items.map((item, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Sub-items */}
                {activeSectionData.subItems && activeSectionData.subItems.length > 0 && (
                  <div className={`ml-4 border-l-2 pl-4 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}>
                    <ul className="space-y-2 text-sm">
                      {activeSectionData.subItems.map((item, index) => (
                        <li key={index} className={`flex gap-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          <Info className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-50" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Caution Note */}
                {activeSectionData.cautionNote && (
                  <div className={`rounded-lg border p-4 ${
                    isDark
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-red-300 bg-red-50 text-red-700'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{activeSectionData.cautionNote}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section Navigation */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  const currentIndex = sections.findIndex(s => s.id === activeSection);
                  if (currentIndex > 0) {
                    setActiveSection(sections[currentIndex - 1].id);
                  }
                }}
                disabled={sections.findIndex(s => s.id === activeSection) === 0}
                className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm transition-colors ${
                  sections.findIndex(s => s.id === activeSection) === 0
                    ? isDark
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-gray-300 cursor-not-allowed'
                    : isDark
                      ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Previous
              </button>

              <div className={`text-center text-xs ${mutedTextClass}`}>
                Section {sections.findIndex(s => s.id === activeSection) + 1} of {sections.length}
              </div>

              <button
                type="button"
                onClick={() => {
                  const currentIndex = sections.findIndex(s => s.id === activeSection);
                  if (currentIndex < sections.length - 1) {
                    setActiveSection(sections[currentIndex + 1].id);
                  }
                }}
                disabled={sections.findIndex(s => s.id === activeSection) === sections.length - 1}
                className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm transition-colors ${
                  sections.findIndex(s => s.id === activeSection) === sections.length - 1
                    ? isDark
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-gray-300 cursor-not-allowed'
                    : isDark
                      ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Acknowledgment */}
            <div
              className={`mt-6 rounded-xl border-2 p-4 sm:p-6 transition-colors ${
                acknowledgedAll
                  ? isDark
                    ? 'border-emerald-500/30 bg-emerald-600/10'
                    : 'border-emerald-300 bg-emerald-100'
                  : isDark
                    ? 'border-yellow-500/30 bg-yellow-600/10'
                    : 'border-yellow-300 bg-yellow-100'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                    acknowledgedAll
                      ? isDark
                        ? 'bg-emerald-600/20'
                        : 'bg-emerald-200'
                      : isDark
                        ? 'bg-yellow-600/20'
                        : 'bg-yellow-200'
                  }`}
                >
                  {acknowledgedAll ? (
                    <CheckCircle className={`h-6 w-6 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                  ) : (
                    <Shield className={`h-6 w-6 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold ${
                    acknowledgedAll
                      ? isDark ? 'text-emerald-400' : 'text-emerald-800'
                      : isDark ? 'text-yellow-400' : 'text-yellow-800'
                  }`}>
                    {acknowledgedAll ? 'Terms Acknowledged' : 'Acknowledgment Required'}
                  </h3>

                  <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {acknowledgedAll
                      ? 'You have acknowledged all terms for this session. Your agreement is recorded.'
                      : 'Please confirm that you understand and agree to these simple usage terms for this session.'}
                  </p>

                  {!acknowledgedAll && (
                    <div className="mt-4 space-y-3">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={acknowledged}
                          onChange={(event) => setAcknowledged(event.target.checked)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={`text-sm leading-5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                          I acknowledge and agree to use LOT responsibly.
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={handleAcknowledgeAll}
                        disabled={!acknowledged}
                        className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:w-auto ${
                          acknowledged
                            ? isDark
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : isDark
                              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Accept All Terms
                      </button>
                    </div>
                  )}

                  {acknowledgedAll && (
                    <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
                      isDark
                        ? 'border-emerald-500/20 bg-emerald-600/10 text-emerald-400'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Acknowledgment recorded for this session at {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>

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
      <div className={`mt-6 border-t pt-4 ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className={`text-center text-xs leading-5 sm:text-left ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            © {new Date().getFullYear()} LOT - Listing Operations Tool.
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <a
              href="#"
              className={`flex items-center gap-1 transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Lock className="h-3 w-3" />
              Privacy Policy
            </a>
            <a
              href="#"
              className={`flex items-center gap-1 transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Users className="h-3 w-3" />
              Contact Support
            </a>
            <a
              href="#"
              className={`flex items-center gap-1 transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Download className="h-3 w-3" />
              Download PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}