import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { isTaskAdminEmail } from '../../../../lib/task-option';

function getColumnLetter(colIndex: number) {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function findCol(headers: any[], name: string): number {
  return headers.findIndex(
    (h: string) => h?.toString().trim().toLowerCase() === name.toLowerCase()
  );
}

// Helper to format date as MM/DD/YYYY
function formatDateForSheet(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US');
}

// Fields an admin is allowed to edit here. Segment is deliberately excluded
// since it's a formula-driven column ("only drag from the top") — it's never
// hand-edited.
const EDITABLE_FIELDS: Record<string, string> = {
  dateRequested: 'Date Requested',
  type: 'Type',
  task: 'Task',
  brand: 'Brand',
  agent: 'Agent',
  dueDate: 'Due Date',
  status: 'Status',
  remarks: 'Remarks',
  auditor: 'Auditor',
  bcLinks: 'BC Links',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spreadsheetId, sheetName, requesterEmail, rowIndex, updates } = body;

    if (!isTaskAdminEmail(requesterEmail)) {
      return NextResponse.json(
        { error: 'Only Arlie, Jonisa, or Melvin can edit tasks that are not their own.' },
        { status: 403 }
      );
    }
    if (!spreadsheetId || !sheetName) {
      return NextResponse.json({ error: 'Missing spreadsheetId or sheetName' }, { status: 400 });
    }
    const rowIndexNum = Number(rowIndex);
    if (!rowIndexNum || isNaN(rowIndexNum) || rowIndexNum < 2) {
      return NextResponse.json({ error: `Invalid rowIndex: ${rowIndex}` }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google credentials' },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const headerResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!1:1`,
    });
    const headers = headerResp.data.values?.[0] || [];

    const batchData: { range: string; values: any[][] }[] = [];

    // Handle BC Links with fallback to 'BC Link' if 'BC Links' not found
    for (const [field, headerName] of Object.entries(EDITABLE_FIELDS)) {
      if (!(field in updates)) continue;
      
      // Special handling for BC Links - try both column names
      let colIndex = findCol(headers, headerName);
      if (field === 'bcLinks' && colIndex === -1) {
        colIndex = findCol(headers, 'BC Link');
      }
      
      if (colIndex === -1) continue;
      const letter = getColumnLetter(colIndex);
      
      // Format dates if it's a date field
      let value = updates[field] ?? '';
      if ((field === 'dateRequested' || field === 'dueDate') && value) {
        value = formatDateForSheet(value);
      }
      
      batchData.push({
        range: `'${sheetName}'!${letter}${rowIndexNum}`,
        values: [[value]],
      });
    }

    // Mirror update-status behavior: keep Date Completed in sync if Status changed
    if ('status' in updates) {
      const statusLower = String(updates.status).toLowerCase();
      const isCompletedOrCancelled = statusLower === 'completed' || statusLower === 'cancelled';
      const dateCompletedCol = findCol(headers, 'Date Completed');
      if (dateCompletedCol !== -1) {
        const letter = getColumnLetter(dateCompletedCol);
        const value = isCompletedOrCancelled
          ? new Date().toLocaleDateString('en-US')
          : '';
        batchData.push({ range: `'${sheetName}'!${letter}${rowIndexNum}`, values: [[value]] });
      }
    }

    if (batchData.length === 0) {
      return NextResponse.json({ error: 'None of the provided fields matched a known column' }, { status: 400 });
    }

    const result = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data: batchData },
    });

    console.log(`✅ Task at row ${rowIndexNum} updated by ${requesterEmail}:`, Object.keys(updates));

    return NextResponse.json({
      success: true,
      updatedCells: result.data.totalUpdatedCells || batchData.length,
    });
  } catch (error: any) {
    console.error('❌ Error updating task:', error);
    return NextResponse.json(
      { error: `Failed to update task: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}