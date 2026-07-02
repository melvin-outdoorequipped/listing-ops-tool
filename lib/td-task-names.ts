// lib/td-task-names.ts
//
// TD Task Name Generator — parsed from the "TD Taskname Generator" Google Sheet.
// Each category maps to a list of task-name templates. Templates use two tokens:
//   {brand}  -> replaced with the task's brand (always lowercase)
//   {agent}  -> replaced with the task's agent
// Any remaining [bracket] placeholders (e.g. "[specify what file]") are intentionally
// left for the user to edit inline before copying — they're free-text fields in the
// original sheet, not something we can safely auto-fill.

export interface TdCategory {
  /** Must match (case-insensitively) the "task" field used in TASK_OPTIONS where possible */
  category: string;
  /** Alternative names that map to this category */
  aliases?: string[];
  templates: string[];
}

export const TD_TASK_CATEGORIES: TdCategory[] = [
  {
    category: 'Data Validation',
    aliases: ['data validation'],
    templates: [
      '{brand}-validating-data sources for new supplier/relist',
    ],
  },
  {
    category: 'New Supplier Analysis and Creation',
    aliases: ['new supplier analysis and creation', 'new supplier', 'supplier analysis'],
    templates: [
      '{brand}-analyzing-new supplier-sources in amazon',
      '{brand}-analyzing-new supplier-sources in shopify',
      '{brand}-creating-new supplier-masterlist',
      '{brand}-creating-new supplier-listing loader file',
      '{brand}-creating-new supplier-ilf',
      '{brand}-creating-new supplier-cost sheet',
      '{brand}-creating-new supplier-sku upc list',
      '{brand}-creating-new supplier-master ilf',
      '{brand}-creating-new supplier-extensiv file',
      '{brand}-correcting-new supplier-masterlist',
      '{brand}-correcting-new supplier-ilf',
      '{brand}-correcting-new supplier-cost sheet',
      '{brand}-correcting-new supplier-sku upc list',
      '{brand}-correcting-new supplier-master ilf',
      '{brand}-reviewing-new supplier-all files',
      '{brand}-reviewing-new supplier-newly uploaded listings',
      '{brand}-uploading-new supplier-ilf',
      '{brand}-attaching-new supplier-all files in basecamp',
      '{brand}-verifying-new supplier-upc/asin (manual)',
      '{brand}-updating-new supplier-all trackers',
      '{brand}-consolidating-new supplier-[specify what file]',
      '{brand}-downloading-new supplier-[specify what file]',
      '{brand}-parsing-new supplier-[specify what file]',
      '{brand}-certify-new supplier-{agent}',
      '{brand}-gathering-new supplier prices',
      '{brand}-gathering-new supplier-data',
      '{brand}-identifying-new supplier-product taxcode',
    ],
  },
  {
    category: 'UPC Match Analysis and Creation',
    aliases: ['upc match analysis and creation', 'upc match', 'upc'],
    templates: [
      '{brand}-analyzing-upc match-sources in amazon',
      '{brand}-analyzing-upc match-sources in shopify',
      '{brand}-creating-upc match-listing loader file',
      '{brand}-creating-upc match-masterlist',
      '{brand}-creating-upc match-ilf',
      '{brand}-creating-upc match-cost sheet',
      '{brand}-creating-upc match-sku upc list',
      '{brand}-creating-upc match-master ilf',
      '{brand}-creating-upc match-extensiv file',
      '{brand}-correcting-upc match-masterlist',
      '{brand}-correcting-upc match-ilf',
      '{brand}-correcting-upc match-cost sheet',
      '{brand}-correcting-upc match-sku upc list',
      '{brand}-correcting-upc match-master ilf',
      '{brand}-reviewing-upc match-all files',
      '{brand}-reviewing-upc match-newly uploaded listings',
      '{brand}-uploading-upc match-ilf',
      '{brand}-attaching-upc match-all files in basecamp',
      '{brand}-verifying-upc match-upc/asin (manual)',
      '{brand}-updating-upc match-all trackers',
      '{brand}-identifying-upc match-item type keywords',
      '{brand}-identifying-upc match-product taxcode',
      '{brand}-editing-upc match-images',
      '{brand}-checking-upc match-missing data requests',
      '{brand}-certify-upc match-{agent}',
      '{brand}-consolidating-upc match-[specify what file]',
      '{brand}-downloading-upc match-[specify what file]',
      '{brand}-parsing-upc match-[specify what file]',
      '{brand}-verifying-upc match-image urls',
      '{brand}-creating-upc match-advertising file',
      '{brand}-gathering-upc match prices',
      '{brand}-gathering-upc match-data',
    ],
  },
  {
    category: 'DUP UPC Match Analysis and Creation',
    aliases: ['dup upc match analysis and creation', 'dup upc match', 'dup upc'],
    templates: [
      '{brand}-analyzing-dup upc match-sources in amazon',
      '{brand}-analyzing-dup upc match-sources in shopify',
      '{brand}-creating-dup upc match-listing loader file',
      '{brand}-creating-dup upc match-masterlist',
      '{brand}-creating-dup upc match-ilf',
      '{brand}-creating-dup upc match-cost sheet',
      '{brand}-creating-dup upc match-sku upc list',
      '{brand}-creating-dup upc match-master ilf',
      '{brand}-creating-dup upc match-extensiv file',
      '{brand}-correcting-dup upc match-masterlist',
      '{brand}-correcting-dup upc match-ilf',
      '{brand}-correcting-dup upc match-cost sheet',
      '{brand}-correcting-dup upc match-sku upc list',
      '{brand}-correcting-dup upc match-master ilf',
      '{brand}-reviewing-dup upc match-all files',
      '{brand}-reviewing-upc match-newly uploaded listings',
      '{brand}-uploading-dup upc match-ilf',
      '{brand}-attaching-dup upc match-all files in basecamp',
      '{brand}-verifying-dup upc match-upc/asin (manual)',
      '{brand}-updating-dup upc match-all trackers',
      '{brand}-identifying-dup upc match-item type keywords',
      '{brand}-identifying-dup upc match-product taxcode',
      '{brand}-editing-dup upc match-images',
      '{brand}-checking-dup upc match-missing data requests',
      '{brand}-certify-dup upc match-{agent}',
      '{brand}-consolidating-dup upc match-[specify what file]',
      '{brand}-downloading-dup upc match-[specify what file]',
      '{brand}-parsing-dup upc match-[specify what file]',
      '{brand}-verifying-dup upc match-image urls',
      '{brand}-creating-dup upc match-advertising file',
      '{brand}-gathering-dup upc match prices',
      '{brand}-gathering-dup upc match-data',
    ],
  },
  {
    category: 'Bulk Order',
    aliases: ['bulk order', 'bulk'],
    templates: [
      '{brand}-analyzing-bulk-sources',
      '{brand}-creating-bulk-listing loader file',
      '{brand}-creating-bulk-masterlist',
      '{brand}-creating-bulk-ilf',
      '{brand}-creating-bulk-ff',
      '{brand}-creating-bulk-cost sheet',
      '{brand}-creating-bulk-sku upc list',
      '{brand}-creating-bulk-master ilf',
      '{brand}-creating-bulk-master ff',
      '{brand}-creating-bulk-listing data',
      '{brand}-creating-bulk-extensiv file',
      '{brand}-correcting-bulk-masterlist',
      '{brand}-correcting-bulk-ilf',
      '{brand}-correcting-bulk-ff',
      '{brand}-correcting-bulk-cost sheet',
      '{brand}-correcting-bulk-sku upc list',
      '{brand}-correcting-bulk-master ilf',
      '{brand}-correcting-bulk-master ff',
      '{brand}-gathering-bulk-pre existing asins',
      '{brand}-gathering-bulk-data',
      '{brand}-identifying-bulk-item type keywords',
      '{brand}-identifying-bulk-product taxcode',
      '{brand}-reviewing-bulk-all files',
      '{brand}-reviewing-bulk-newly uploaded listings',
      '{brand}-uploading-bulk-ilf',
      '{brand}-uploading-bulk-ff',
      '{brand}-attaching-bulk-all files in basecamp',
      '{brand}-verifying-bulk-upc/asin (manual)',
      '{brand}-verifying-bulk-image urls',
      '{brand}-verifying-bulk-images',
      '{brand}-updating-bulk-all trackers',
      '{brand}-editing-bulk-images',
      '{brand}-checking-bulk-missing data requests',
      '{brand}-certify-bulk-{agent}',
      '{brand}-consolidating-bulk-[specify what file]',
      '{brand}-downloading-bulk-[specify what file]',
      '{brand}-parsing-bulk-[specify what file]',
      '{brand}-creating-bulk-advertising file',
      '{brand}-gathering-bulk prices',
      '{brand}-creating-bulk-shipping plan file',
      '{brand}-uploading-bulk-shipping plan file',
      '{brand}-reviewing-bulk-shipping plan file',
      '{brand}-correcting-bulk-listing data',
    ],
  },
  {
    category: 'NON UPC Match Analysis and Creation',
    aliases: ['non upc match analysis and creation', 'non upc match', 'non upc'],
    templates: [
      '{brand}-analyzing-non upc match-sources in amazon',
      '{brand}-analyzing-non upc match-sources in shopify',
      '{brand}-creating-non upc match-listing loader file',
      '{brand}-creating-non upc match-masterlist',
      '{brand}-creating-non upc match-ff',
      '{brand}-creating-non upc match-cost sheet',
      '{brand}-creating-non upc match-sku upc list',
      '{brand}-creating-non upc match-master ff',
      '{brand}-creating-non upc match-extensiv file',
      '{brand}-correcting-non upc match-masterlist',
      '{brand}-correcting-non upc match-ff',
      '{brand}-correcting-non upc match-cost sheet',
      '{brand}-correcting-non upc match-sku upc list',
      '{brand}-correcting-non upc match-master ff',
      '{brand}-reviewing-non upc match-all files',
      '{brand}-reviewing-non upc match-newly uploaded listings',
      '{brand}-uploading-non upc match-ff',
      '{brand}-attaching-non upc match-all files in basecamp',
      '{brand}-verifying-non upc match-upc/asin (manual)',
      '{brand}-verifying-non upc match-image urls',
      '{brand}-updating-non upc match-all trackers',
      '{brand}-gathering-non upc match-pre existing asins',
      '{brand}-gathering-non upc match-data',
      '{brand}-identifying-non upc match-item type keywords',
      '{brand}-identifying-non upc match-product taxcode',
      '{brand}-editing-non upc match-images',
      '{brand}-checking-non upc match-missing data requests',
      '{brand}-certify-non upc match-{agent}',
      '{brand}-consolidating-non upc match-[specify what file]',
      '{brand}-downloading-non upc match-[specify what file]',
      '{brand}-parsing-non upc match-[specify what file]',
      '{brand}-creating-non upc match-advertising file',
      '{brand}-gathering-non upc match prices',
    ],
  },
  {
    category: 'Prebook Order',
    aliases: ['prebook order', 'prebook'],
    templates: [
      '{brand}-analyzing-prebook-sources',
      '{brand}-creating-prebook-listing loader file',
      '{brand}-creating-prebook-masterlist',
      '{brand}-creating-prebook-ilf',
      '{brand}-creating-prebook-ff',
      '{brand}-creating-prebook-cost sheet',
      '{brand}-creating-prebook-sku upc list',
      '{brand}-creating-prebook-master ilf',
      '{brand}-creating-prebook-master ff',
      '{brand}-creating-prebook-listing data',
      '{brand}-creating-prebook-extensiv file',
      '{brand}-correcting-prebook-masterlist',
      '{brand}-correcting-prebook-ilf',
      '{brand}-correcting-prebook-ff',
      '{brand}-correcting-prebook-cost sheet',
      '{brand}-correcting-prebook-sku upc list',
      '{brand}-correcting-prebook-master ilf',
      '{brand}-correcting-prebook-master ff',
      '{brand}-gathering-prebook-pre existing asins',
      '{brand}-gathering-prebook-data',
      '{brand}-identifying-prebook-item type keywords',
      '{brand}-identifying-prebook-product taxcode',
      '{brand}-reviewing-prebook-all files',
      '{brand}-reviewing-prebook-newly uploaded listings',
      '{brand}-uploading-prebook-ilf',
      '{brand}-uploading-prebook-ff',
      '{brand}-attaching-prebook-all files in basecamp',
      '{brand}-verifying-prebook-upc/asin (manual)',
      '{brand}-verifying-prebook-image urls',
      '{brand}-verifying-prebook-images',
      '{brand}-updating-prebook-all trackers',
      '{brand}-editing-prebook-images',
      '{brand}-checking-prebook-missing data requests',
      '{brand}-certify-prebook-{agent}',
      '{brand}-consolidating-prebook-[specify what file]',
      '{brand}-downloading-prebook-[specify what file]',
      '{brand}-parsing-prebook-[specify what file]',
      '{brand}-creating-prebook-advertising file',
      '{brand}-gathering-prebook prices',
      '{brand}-creating-prebook-shipping plan file',
      '{brand}-uploading-prebook-shipping plan file',
      '{brand}-reviewing-prebook-shipping plan file',
      '{brand}-correcting-prebook-listing data',
    ],
  },
  {
    category: 'Opening Order/Test Order',
    aliases: ['opening order/test order', 'opening order', 'test order', 'oo'],
    templates: [
      '{brand}-analyzing-oo-sources',
      '{brand}-creating-oo-listing loader file',
      '{brand}-creating-oo-masterlist',
      '{brand}-creating-oo-ilf',
      '{brand}-creating-oo-ff',
      '{brand}-creating-oo-cost sheet',
      '{brand}-creating-oo-sku upc list',
      '{brand}-creating-oo-master ilf',
      '{brand}-creating-oo-master ff',
      '{brand}-creating-oo-listing data',
      '{brand}-creating-oo-extensiv file',
      '{brand}-correcting-oo-masterlist',
      '{brand}-correcting-oo-ilf',
      '{brand}-correcting-oo-ff',
      '{brand}-correcting-oo-cost sheet',
      '{brand}-correcting-oo-sku upc list',
      '{brand}-correcting-oo-master ilf',
      '{brand}-correcting-oo-master ff',
      '{brand}-gathering-oo-pre existing asins',
      '{brand}-gathering-oo-data',
      '{brand}-identifying-oo-item type keywords',
      '{brand}-identifying-oo-product taxcode',
      '{brand}-reviewing-oo-all files',
      '{brand}-reviewing-oo-newly uploaded listings',
      '{brand}-uploading-oo-ilf',
      '{brand}-uploading-oo-ff',
      '{brand}-attaching-oo-all files in basecamp',
      '{brand}-verifying-oo-upc/asin (manual)',
      '{brand}-verifying-oo-image urls',
      '{brand}-verifying-oo-images',
      '{brand}-updating-oo-all trackers',
      '{brand}-editing-oo-images',
      '{brand}-checking-oo-missing data requests',
      '{brand}-certify-oo-{agent}',
      '{brand}-consolidating-oo-[specify what file]',
      '{brand}-downloading-oo-[specify what file]',
      '{brand}-parsing-oo-[specify what file]',
      '{brand}-creating-oo-advertising file',
      '{brand}-gathering-oo prices',
    ],
  },
  {
    category: 'Corrections',
    aliases: ['corrections', 'correx', 'fixing'],
    templates: [
      '{brand}-fixing-listing issues-mismatch',
      '{brand}-fixing-listing issues-stranded',
      '{brand}-fixing-listing issues-stand alone',
      '{brand}-fixing-listing issues-suppressed',
      '{brand}-fixing-listing issues-quality alerts',
      '{brand}-fixing-listing issues-missing detail page',
      '{brand}-investigating-listing issues',
      '{brand}-sending-listing issues-amazon cases',
      '{brand}-checking-listing issues-amazon cases & ff-ups',
      '[all brands]-checking-listing issues-amazon peformance notifications',
      '{brand}-investigating-listing issues-policy warnings',
      '{brand}-certify-listing issues-mismatch-{agent}',
      '{brand}-certify-listing issues-stranded-{agent}',
      '{brand}-certify-listing issues-stand alone-{agent}',
      '{brand}-certify-listing issues-duplicates-{agent}',
      '{brand}-certify-listing issues-suppressed-{agent}',
      '{brand}-certify-listing issues-missing detail page-{agent}',
      '{brand}-consolidating-listing issues-[specify what file]',
      '{brand}-downloading-listing issues-[specify what file]',
      '{brand}-parsing-listing issues-[specify what file]',
      '{brand}-creating-listing issues-stranded masterlist',
      '{brand}-creating-listing issues-stranded ilf',
      '{brand}-creating-listing issues-stranded cost sheet',
      '{brand}-creating-listing issues-delete file',
      '{brand}-correcting-listing issues-stranded masterlist',
      '{brand}-correcting-listing issues-stranded ilf',
      '{brand}-correcting-listing issues-stranded cost sheet',
      '{brand}-reviewing-listing issues-stranded all files',
      '{brand}-reviewing-listing issues-stranded newly reactivated items',
      '{brand}-uploading-listing issues-stranded ilf',
      '{brand}-attaching-listing issues-stranded files in basecamp',
      '{brand}-reviewing-listing issues-deletion file-ilf',
      '{brand}-uploading-listing issues-deletion file-ilf',
      '{brand}-uploading-listing issues-listing quality and suppressed file',
      '{brand}-creating-listing issues-listing quality and suppressed file',
      '{brand}-reviewing-listing issues-listing quality and suppressed file',
      '{brand}-uploading-listing issues-partial update',
      '{brand}-fixing-listing issues-incomplete title',
      '{brand}-creating-listing issues-stranded advertising file',
    ],
  },
  {
    category: 'Shopkeep/Amazon Prime',
    aliases: ['shopkeep/amazon prime', 'shopkeep', 'amazon prime'],
    templates: [
      '{brand}-analyzing-shopkeep-sources in store',
      '{brand}-creating-shopkeep-import file',
      '{brand}-creating-shopkeep-listing loader file',
      '{brand}-creating-shopkeep-masterlist',
      '{brand}-creating-shopkeep-ilf',
      '{brand}-creating-shopkeep-ff',
      '{brand}-creating-shopkeep-cost sheet',
      '{brand}-creating-shopkeep-sku upc list',
      '{brand}-creating-shopkeep-master ff',
      '{brand}-correcting-shopkeep-import file',
      '{brand}-correcting-shopkeep-masterlist',
      '{brand}-correcting-shopkeep-ilf',
      '{brand}-correcting-shopkeep-ff',
      '{brand}-correcting-shopkeep-cost sheet',
      '{brand}-correcting-shopkeep-sku upc list',
      '{brand}-correcting-shopkeep-master ilf',
      '{brand}-correcting-shopkeep-master ff',
      '{brand}-reviewing-shopkeep-all files',
      '{brand}-reviewing-shopkeep-newly uploaded listings',
      '{brand}-uploading-shopkeep-ilf',
      '{brand}-uploading-shopkeep-ff',
      '{brand}-uploading-shopkeep-import file',
      '{brand}-attaching-shopkeep-all files in basecamp',
      '{brand}-verifying-shopkeep-upc/asin (manual)',
      '{brand}-verifying-shopkeep-image urls',
      '{brand}-updating-shopkeep-all trackers',
      '{brand}-gathering-shopkeep-pre existing asins',
      '{brand}-gathering-shopkeep-data',
      '{brand}-identifying-shopkeep-item type keywords amazon prime',
      '{brand}-identifying-shopkeep-product taxcode',
      '{brand}-editing-shopkeep-images',
      '{brand}-checking-shopkeep-missing data requests',
      '{brand}-certify-shopkeep-{agent}',
      '{brand}-consolidating-shopkeep-[specify what file]',
      '{brand}-downloading-shopkeep-[specify what file]',
      '{brand}-parsing-shopkeep-[specify what file]',
      '{brand}-creating-shopkeep-listing data',
      '{brand}-analyzing-shopkeep-sources in amazon',
      '{brand}-creating-shopkeep-masterlist amazon prime',
      '{brand}-correcting-shopkeep-masterlist amazon prime',
      '{brand}-attaching-shopkeep-all files in basecamp amazon prime',
    ],
  },
  {
    category: 'Shopify',
    aliases: ['shopify'],
    templates: [
      '{brand}-analyzing-shopify-sources',
      '{brand}-importing-shopify-report',
      '{brand}-creating-shopify-masterlist',
      '{brand}-creating-shopify-cost sheet',
      '{brand}-creating-shopify-sku upc list',
      '{brand}-correcting-shopify-masterlist',
      '{brand}-correcting-shopify-cost sheet',
      '{brand}-correcting-shopify-sku upc list',
      '{brand}-reviewing-shopify-all files',
      '{brand}-reviewing-shopify-newly uploaded listings',
      '{brand}-attaching-shopify-all files in basecamp',
      '{brand}-updating-shopify-all trackers',
      '{brand}-gathering-shopify-data',
      '{brand}-editing-shopify-images',
      '{brand}-checking-shopify-missing data requests',
      '{brand}-certify-shopify-{agent}',
      '{brand}-updating-shopify-banner',
      '{brand}-consolidating-shopify-[specify what file]',
      '{brand}-downloading-shopify-[specify what file]',
      '{brand}-parsing-shopify-[specify what file]',
      '{brand}-investigating-shopify-listing issues',
      '{brand}-creating-shopify-import file',
      '{brand}-creating-shopify-landing page',
      '{brand}-creating-shopify-benefit text',
      '{brand}-fixing-shopify-listing issues',
    ],
  },
  {
    category: 'SKUVAULT/Warehouse',
    aliases: ['skuvault/warehouse', 'skuvault', 'warehouse'],
    templates: [
      '{brand}-analyzing-skuvault-sources',
      '{brand}-downloading-skuvault-report',
      '{brand}-creating-skuvault-masterlist',
      '{brand}-creating-skuvault-cost sheet',
      '{brand}-creating-skuvault-sku upc list',
      '{brand}-creating-skuvault-ilf',
      '{brand}-creating-skuvault-ff',
      '{brand}-creating-skuvault-advertising file',
      '{brand}-creating-extensiv file',
      '{brand}-correcting-skuvault-masterlist',
      '{brand}-correcting-skuvault-cost sheet',
      '{brand}-correcting-skuvault-sku upc list',
      '{brand}-reviewing-skuvault-all files',
      '{brand}-reviewing-skuvault-newly uploaded listings',
      '{brand}-attaching-skuvault-all files in basecamp',
      '{brand}-updating-skuvault-all trackers',
      '{brand}-gathering-skuvault-data',
      '{brand}-editing-skuvault-images',
      '{brand}-checking-skuvault-missing data requests',
      '{brand}-certify-skuvault-{agent}',
      '{brand}-consolidating-skuvault-[specify what file]',
      '{brand}-downloading-skuvault-[specify what file]',
      '{brand}-parsing-skuvault-[specify what file]',
      '{brand}-uploading-skuvault-ilf',
      '{brand}-uploading-skuvault-ff',
      '[all brands]-investigating-skuvault-listing issues',
      '{brand}-auditing-skuvault-po',
      '{brand}-updating-skuvault-onsite weights/dimensions',
      '{brand}-verifying-skuvault-upc/asin (manual)',
    ],
  },
  {
    category: 'Listing Loader Request/Others',
    aliases: ['listing loader request/others', 'listing loader', 'll'],
    templates: [
      '{brand}-analyzing-ll-sources listing loader request',
      '{brand}-creating-ll-listing loader request',
      '{brand}-verifying-ll-listing loader request (manual)',
      '{brand}-updating-search term',
      '{brand}-verifying-listing issues',
    ],
  },
  {
    category: 'Walmart',
    aliases: ['walmart'],
    templates: [
      '{brand}-creating-masterlist walmart',
    ],
  },
  {
    category: 'Monitoring/Addressing Messages',
    aliases: ['monitoring/addressing messages', 'monitoring', 'messages'],
    templates: [
      'none-checking-skype concerns',
      'none-checking-email concerns',
      'none-checking-basecamp notifications',
      'none-prioritizing tasks',
      'none-addressing-concerns-via skype',
      'none-addressing-concerns-via email',
      'none-addressing-concerns-via basecamp',
      'none-filling out-audit questionnaire',
      '{brand}-updating-consolidated brand restrictions sheet',
      'none-task assigning',
      'none-updating-listing trackers',
      'none-discussing-[task][name of person]',
      '{brand}-updating-listing escalation tracker',
    ],
  },
  {
    category: 'ADMIN',
    aliases: ['admin'],
    templates: [
      'admin-break',
      'admin-training:[task]-[person]',
      'admin-feedbacking-[name of person/group]',
      'admin-assisting-[task] [name of person/group]',
      'admin-checking-[Subject]',
      'admin-creating-[Subject]',
      'admin-meeting-[name of person/group]',
      'admin-coaching-[name of person/group]',
      'sbs-certifying-[task name]-{agent}',
      'admin-observing:[task]-[name of person]',
      'admin-meeting-team-listing ops',
      'admin-1on1-[put task if needed]-[name]',
    ],
  },
];

/** Quick lookup map, case-insensitive on the category key and aliases */
const categoryLookup = new Map<string, TdCategory>();

TD_TASK_CATEGORIES.forEach((cat) => {
  // Add the main category name
  categoryLookup.set(cat.category.toLowerCase().trim(), cat);
  // Add all aliases
  if (cat.aliases) {
    cat.aliases.forEach((alias) => {
      categoryLookup.set(alias.toLowerCase().trim(), cat);
    });
  }
});

export function findCategoryByTaskName(taskName: string | undefined | null): TdCategory | null {
  if (!taskName) return null;
  
  // Try exact match first
  const exactMatch = categoryLookup.get(taskName.toLowerCase().trim());
  if (exactMatch) return exactMatch;
  
  // Try partial match - check if taskName contains any category name or alias
  const taskLower = taskName.toLowerCase().trim();
  for (const [key, category] of categoryLookup) {
    if (taskLower.includes(key) || key.includes(taskLower)) {
      return category;
    }
  }
  
  return null;
}

/** Returns the first name only, e.g. "Melvin Reyes" -> "Melvin", or the email prefix as fallback */
export function shortAgentName(agent: string | undefined | null): string {
  if (!agent) return '';
  const trimmed = agent.trim();
  if (trimmed.includes('@')) return trimmed.split('@')[0];
  return trimmed.split(' ')[0];
}

/** 
 * Fills in {brand} / {agent} tokens. 
 * Brand is ALWAYS converted to lowercase for consistency.
 * Any leftover [bracket] fields are left as-is for manual edit.
 */
export function generateTaskName(
  template: string,
  vars: { brand?: string; agent?: string }
): string {
  const brand = (vars.brand || '').trim().toLowerCase(); // ← Convert to lowercase
  const agent = shortAgentName(vars.agent);
  return template
    .replaceAll('{brand}', brand || '[brand]')
    .replaceAll('{agent}', agent || '[agent]');
}

/** True if the generated string still has bracketed placeholders that need manual editing */
export function hasEditablePlaceholders(generated: string): boolean {
  return /\[[^\]]+\]/.test(generated);
}

export interface RecentTaskName {
  text: string;
  category: string;
  timestamp: number;
}

const RECENTS_PREFIX = 'td_recent_task_names_';
const MAX_RECENTS = 8;

export function loadRecentTaskNames(userKey: string): RecentTaskName[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENTS_PREFIX + userKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushRecentTaskName(userKey: string, entry: RecentTaskName) {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadRecentTaskNames(userKey).filter((r) => r.text !== entry.text);
    const updated = [entry, ...existing].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_PREFIX + userKey, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — fail silently, this is a non-critical convenience feature
  }
}