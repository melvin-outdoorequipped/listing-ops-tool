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

// Shifts every standalone row-number that matches `fromRow` inside a formula
// string to `toRow`. This is how we "drag" the Segment formula down from the
// last populated row to the brand new row, since Segment is fully
// formula-driven in this sheet and should never be typed manually.
function shiftFormulaRow(formula: string, fromRow: number, toRow: number): string {
  return formula.replace(/([A-Za-z$]+)(\$?)(\d+)/g, (match, colPart, dollar, rowPart) => {
    if (Number(rowPart) === fromRow) {
      return `${colPart}${dollar}${toRow}`;
    }
    return match;
  });
}

function findCol(headers: any[], name: string): number {
  return headers.findIndex(
    (h: string) => h?.toString().trim().toLowerCase() === name.toLowerCase()
  );
}

// Helper to format date as MM/DD/YYYY
function formatDateForSheet(dateStr: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-US');
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return new Date().toLocaleDateString('en-US');
  return date.toLocaleDateString('en-US');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      spreadsheetId,
      sheetName,
      requesterEmail,
      dateRequested,
      type,
      task,
      brand,
      agent,
      dueDate,
      remarks,
      status,
      bcLinks,
    } = body;

    if (!isTaskAdminEmail(requesterEmail)) {
      return NextResponse.json(
        { error: 'Only Arlie, Jonisa, or Melvin can add new tasks to the tracker.' },
        { status: 403 }
      );
    }

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json(
        { error: 'Missing spreadsheetId or sheetName' },
        { status: 400 }
      );
    }
    if (!task || !brand || !agent) {
      return NextResponse.json(
        { error: 'Task, Brand, and Agent are required' },
        { status: 400 }
      );
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

    // 1. Headers
    const headerResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!1:1`,
    });
    const headers = headerResp.data.values?.[0] || [];

    const colDateRequested = findCol(headers, 'Date Requested');
    const colSegment = findCol(headers, 'Segment');
    const colType = findCol(headers, 'Type');
    const colTask = findCol(headers, 'Task');
    const colBrand = findCol(headers, 'Brand');
    const colAgent = findCol(headers, 'Agent');
    const colDueDate = findCol(headers, 'Due Date');
    const colStatus = findCol(headers, 'Status');
    const colRemarks = findCol(headers, 'Remarks');
    const colBCLinks = findCol(headers, 'BC Links') ?? findCol(headers, 'BC Link');

    if (colTask === -1 || colBrand === -1 || colAgent === -1) {
      return NextResponse.json(
        { error: `Could not find Task/Brand/Agent columns. Headers: ${headers.join(', ')}` },
        { status: 400 }
      );
    }

    // 2. Find the next empty row by checking column A (Date Requested) for
    // the true "bottom" of the table.
    const colAValues = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A2:A`,
    });
    const existingRows = colAValues.data.values || [];
    const lastRowWithData = existingRows.length + 1; // +1 because we started at row 2
    const newRow = lastRowWithData + 1;

    // 3. Copy the Segment formula down from the row above (per instructions:
    // Segment is formula-driven and should only ever be "dragged" down).
    let segmentFormula: string | null = null;
    if (colSegment !== -1 && lastRowWithData >= 2) {
      try {
        const segColLetter = getColumnLetter(colSegment);
        const segResp = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetName}'!${segColLetter}${lastRowWithData}`,
          valueRenderOption: 'FORMULA',
        });
        const existingFormula = segResp.data.values?.[0]?.[0];
        if (typeof existingFormula === 'string' && existingFormula.startsWith('=')) {
          segmentFormula = shiftFormulaRow(existingFormula, lastRowWithData, newRow);
        }
      } catch (e) {
        console.warn('⚠️ Could not read/copy Segment formula, leaving it blank:', e);
      }
    }

    // 4. Build the batch update for the new row
    const updates: { range: string; values: any[][] }[] = [];
    const setCell = (colIndex: number, value: any) => {
      if (colIndex === -1) return;
      const letter = getColumnLetter(colIndex);
      updates.push({ range: `'${sheetName}'!${letter}${newRow}`, values: [[value]] });
    };

    // Format dates for the sheet
    const formattedDateRequested = formatDateForSheet(dateRequested);
    const formattedDueDate = dueDate ? formatDateForSheet(dueDate) : '';

    setCell(colDateRequested, formattedDateRequested);
    setCell(colType, type || '');
    setCell(colTask, task);
    setCell(colBrand, brand);
    setCell(colAgent, agent);
    setCell(colDueDate, formattedDueDate);
    setCell(colStatus, status || 'Pending');
    setCell(colRemarks, remarks || '');
    setCell(colBCLinks, bcLinks || '');
    if (segmentFormula) setCell(colSegment, segmentFormula);

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates,
      },
    });

    console.log(`✅ Added new task "${task}" for ${agent} at row ${newRow} (by ${requesterEmail})`);

    return NextResponse.json({
      success: true,
      rowIndex: newRow,
      segmentFormulaCopied: !!segmentFormula,
    });
  } catch (error: any) {
    console.error('❌ Error adding task:', error);
    return NextResponse.json(
      { error: `Failed to add task: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}