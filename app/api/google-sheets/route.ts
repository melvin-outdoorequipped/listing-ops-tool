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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 /api/google-sheets request body:', body);

    const { spreadsheetId, sheetName, userEmail } = body;

    // Validate required parameters
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Missing required parameter: spreadsheetId' },
        { status: 400 }
      );
    }
    if (!sheetName) {
      return NextResponse.json(
        { error: 'Missing required parameter: sheetName' },
        { status: 400 }
      );
    }
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing required parameter: userEmail' },
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

    // Fetch the sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A:Z`,
      majorDimension: 'ROWS',
    });

    const values = response.data.values || [];
    if (values.length < 2) {
      console.log('📊 No data rows found in sheet');
      return NextResponse.json({ values: [] });
    }

    const headers = values[0];
    const agentCol = headers.findIndex(
      (h: string) => h?.toString().trim().toLowerCase() === 'agent'
    );

    if (agentCol === -1) {
      console.error('⚠️ Agent column not found in headers:', headers);
      return NextResponse.json({ values: [] });
    }

    // Get the target agent name from the email
    const emailLower = userEmail.toLowerCase().trim();
    const targetAgent = TEAM_MEMBERS[emailLower] || emailLower.split('@')[0];
    const targetAgentLower = targetAgent.toLowerCase().trim();
    
    console.log(`🔍 Filtering for agent: "${targetAgentLower}" (from email: ${emailLower})`);

    // Filter rows to only those assigned to this user
    const filteredRows = values
  .slice(1)
  .map((row, index) => ({
    row,
    rowIndex: index + 2, // ORIGINAL Google Sheet row
  }))
  .filter(({ row }) => {
    const agentValue = row[agentCol]?.toString().trim() || "";
    const agentLower = agentValue.toLowerCase();

    if (agentLower === targetAgentLower) return true;

    for (const [email, name] of Object.entries(TEAM_MEMBERS)) {
      if (email === emailLower && name.toLowerCase() === agentLower) {
        return true;
      }
    }

    return false;
  });

    console.log(`📊 Filtered ${filteredRows.length} tasks for "${targetAgent}"`);

    if (filteredRows.length === 0) {
      // Log some sample agent names for debugging
      console.log('⚠️ No tasks found. Sample agent names in sheet:',
        values.slice(1, 5).map(row => row[agentCol]?.toString().trim())
      );
    }

    return NextResponse.json({
        headers,
        rows: filteredRows,
        total: filteredRows.length,
    });
    
  } catch (error: any) {
    console.error('Error in /api/google-sheets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch tasks: ' + (error.message || 'Unknown error'),
        details: error.response?.data || null
      },
      { status: 500 }
    );
  }
}