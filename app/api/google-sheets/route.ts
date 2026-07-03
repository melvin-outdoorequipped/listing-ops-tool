// /app/api/google-sheets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1aBOYH2ShWyW8ASamH23WAFdoi0NR8bIebsQGuAnU67A';
const SHEET_NAME = 'Copy of Task Masterlist - Operations';

// Team members mapping - EXACT names as they appear in the sheet
const TEAM_MEMBERS: Record<string, string> = {
  'melvin@outdoorequipped.com': 'Melvin',
  'arlie@outdoorequipped.com': 'Arlie',
  'jbermoy@outdoorequipped.com': 'Janroe',
  'florante@outdoorequipped.com': 'Florante',
  'jerald@outdoorequipped.com': 'Jerald',
  'juddy@outdoorequipped.com': 'Juddy',
  'spuebla@outdoorequipped.com': 'Shenna',
  'wjdelcorro@outdoorequipped.com': 'Wyndell',
  'jonisa@outdoorequipped.com': 'Jonisa',
  'lawrencelaudeza@outdoorequipped.com': 'Lawrence',
  'mpasturan@outdoorequipped.com': 'Mark',
};

// ─── RAW SHEET CACHE ──────────────────────────────────────────────────
type CacheEntry = { values: string[][]; timestamp: number };
const sheetCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds cache

// In-flight request de-duplication
const inFlight = new Map<string, Promise<string[][]>>();

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err?.code === 429 || err?.status === 429;
      const isLastAttempt = attempt === retries;
      if (!isRateLimit || isLastAttempt) throw err;

      const delay = baseDelayMs * 2 ** attempt + Math.random() * 500;
      console.warn(`⏳ Sheets API 429 — retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('fetchWithRetry: exhausted retries');
}

async function getSheetValues(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const cacheKey = `${spreadsheetId}::${sheetName}`;

  const cached = sheetCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`✅ Cache hit for "${sheetName}"`);
    return cached.values;
  }

  const pending = inFlight.get(cacheKey);
  if (pending) {
    console.log(`🔁 Joining in-flight request for "${sheetName}"`);
    return pending;
  }

  const fetchPromise = (async () => {
    try {
      console.log(`📥 Fetching sheet data for "${sheetName}"...`);
      const response = await fetchWithRetry(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetName}'!A:Z`,
          majorDimension: 'ROWS',
        })
      );

      const values = (response.data.values || []) as string[][];
      console.log(`✅ Fetched ${values.length} rows (including header)`);
      
      sheetCache.set(cacheKey, { values, timestamp: Date.now() });
      return values;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 /api/google-sheets request:', { 
      viewAll: body.viewAll, 
      userEmail: body.userEmail?.substring(0, 10) + '...' 
    });

    const { spreadsheetId, sheetName, userEmail, viewAll } = body;

    // Validate required parameters
    if (!spreadsheetId || !sheetName || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required parameters: spreadsheetId, sheetName, and userEmail are required' },
        { status: 400 }
      );
    }

    // Check for Google credentials
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Missing Google credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google credentials' },
        { status: 500 }
      );
    }

    // Initialize Google Sheets auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch the sheet data (cached + retried)
    const values = await getSheetValues(sheets, spreadsheetId, sheetName);

    if (values.length < 2) {
      console.log('📊 No data rows found in sheet');
      return NextResponse.json({ 
        headers: [],
        rows: [],
        total: 0 
      });
    }

    const headers = values[0];
    console.log(`📊 Headers: ${headers.length} columns`);

    // ─── VIEW ALL MODE ──────────────────────────────────────────────────
    if (viewAll) {
      console.log('👁️ View All mode activated');
      
      // Process ALL rows with their actual Google Sheet row numbers
      const allRows = values
        .slice(1) // Skip header row
        .map((row, index) => ({
          row: row,
          rowIndex: index + 2, // Actual Google Sheet row number (header is row 1)
        }))
        .filter(({ row }) => {
          // Check if row has any data
          return row.some((cell) => cell !== undefined && cell !== null && cell.toString().trim() !== '');
        })
        .sort((a, b) => b.rowIndex - a.rowIndex); // Sort DESCENDING by row number (newest first)

      console.log(`✅ View All: Returning ${allRows.length} tasks`);

      return NextResponse.json({
        headers: headers,
        rows: allRows,
        total: allRows.length,
      });
    }

    // ─── FILTER BY AGENT MODE ──────────────────────────────────────────
    console.log('🔍 Filter by agent mode activated');

    // Find the agent column
    const agentCol = headers.findIndex(
      (h: string) => h?.toString().trim().toLowerCase() === 'agent'
    );

    if (agentCol === -1) {
      console.error('⚠️ Agent column not found in headers');
      return NextResponse.json({ 
        headers: [],
        rows: [],
        total: 0 
      });
    }

    // Get the target agent name from the email
    const emailLower = userEmail.toLowerCase().trim();
    const targetAgent = TEAM_MEMBERS[emailLower] || emailLower.split('@')[0];
    const targetAgentLower = targetAgent.toLowerCase().trim();

    console.log(`🎯 Filtering for agent: "${targetAgentLower}"`);

    // Filter rows to only those assigned to this user
    const filteredRows = values
      .slice(1) // Skip header row
      .map((row, index) => ({
        row: row,
        rowIndex: index + 2, // Actual Google Sheet row number
      }))
      .filter(({ row }) => {
        const agentValue = row[agentCol]?.toString().trim() || '';
        const agentLower = agentValue.toLowerCase();

        if (agentLower === targetAgentLower) return true;

        // Check if any email in TEAM_MEMBERS matches the agent name
        for (const [email, name] of Object.entries(TEAM_MEMBERS)) {
          if (email === emailLower && name.toLowerCase() === agentLower) {
            return true;
          }
        }

        return false;
      })
      .sort((a, b) => b.rowIndex - a.rowIndex); // Sort DESCENDING by row number

    console.log(`✅ Filtered: ${filteredRows.length} tasks for "${targetAgent}"`);

    return NextResponse.json({
      headers: headers,
      rows: filteredRows,
      total: filteredRows.length,
    });

  } catch (error: any) {
    console.error('❌ Error in /api/google-sheets:', error);

    const isRateLimit = error?.code === 429 || error?.status === 429;

    return NextResponse.json(
      {
        error: isRateLimit
          ? 'Google Sheets is temporarily rate-limited. Please try again in a moment.'
          : 'Failed to fetch tasks: ' + (error.message || 'Unknown error'),
        details: error.response?.data || null,
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}