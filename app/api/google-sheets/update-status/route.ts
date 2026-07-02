// /app/api/google-sheets/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

function getColumnLetter(colIndex: number) {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export async function POST(request: NextRequest) {
  console.log('🚀 Update status API called');
  
  try {
    const body = await request.json();
    console.log('📝 Request body:', JSON.stringify(body, null, 2));

    const { spreadsheetId, sheetName, rowIndex, newStatus, reasonForPending } = body;

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
    if (!rowIndex) {
      return NextResponse.json(
        { error: 'Missing required parameter: rowIndex' },
        { status: 400 }
      );
    }
    if (!newStatus) {
      return NextResponse.json(
        { error: 'Missing required parameter: newStatus' },
        { status: 400 }
      );
    }

    const rowIndexNum = Number(rowIndex);
    if (isNaN(rowIndexNum) || rowIndexNum < 2) {
      return NextResponse.json(
        { error: `Invalid rowIndex: ${rowIndex}. Must be a number >= 2` },
        { status: 400 }
      );
    }

    // Check for Google credentials
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.error('❌ Missing GOOGLE_SERVICE_ACCOUNT_EMAIL');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google credentials' },
        { status: 500 }
      );
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      console.error('❌ Missing GOOGLE_PRIVATE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google credentials' },
        { status: 500 }
      );
    }

    console.log('🔐 Initializing Google Auth...');
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Auth initialized');

    // Get headers to find columns
    console.log(`📊 Fetching headers from sheet: ${sheetName}`);
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    console.log('📊 Headers found:', headers);

    // Find columns - IMPORTANT: Find the FIRST occurrence of each column
    let statusColIndex = -1;
    let dateCompletedColIndex = -1;
    let reasonPendingColIndex = -1;
    let reasonCancelColIndex = -1;

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.toString().trim().toLowerCase();
      
      // Only set if not found yet (take the FIRST occurrence)
      if (header === 'status' && statusColIndex === -1) {
        statusColIndex = i;
        console.log(`📍 Found FIRST Status column at index ${i}: "${headers[i]}"`);
      } else if (header === 'date completed' && dateCompletedColIndex === -1) {
        dateCompletedColIndex = i;
        console.log(`📍 Found Date Completed column at index ${i}: "${headers[i]}"`);
      } else if (header === 'reason for pending' && reasonPendingColIndex === -1) {
        reasonPendingColIndex = i;
        console.log(`📍 Found Reason for Pending column at index ${i}: "${headers[i]}"`);
      } else if (header === 'reason for cancel' && reasonCancelColIndex === -1) {
        reasonCancelColIndex = i;
        console.log(`📍 Found Reason for Cancel column at index ${i}: "${headers[i]}"`);
      }
    }

    if (statusColIndex === -1) {
      console.error('❌ Status column not found');
      return NextResponse.json(
        { error: 'Status column not found in the sheet' },
        { status: 400 }
      );
    }

    const statusColLetter = getColumnLetter(statusColIndex);
    const statusRange = `'${sheetName}'!${statusColLetter}${rowIndexNum}`;
    console.log(`📤 Updating FIRST Status range: ${statusRange} to "${newStatus}"`);

    const statusLower = newStatus.toLowerCase();
    const isPending = statusLower === 'pending';
    const isCompletedOrCancelled = statusLower === 'completed' || statusLower === 'cancelled';

    // Build updates array
    const updates: { range: string; values: any[][] }[] = [];

    // 1. Update the FIRST Status column
    updates.push({ range: statusRange, values: [[newStatus]] });

    // 2. Handle Date Completed
    if (dateCompletedColIndex !== -1) {
      const dateColLetter = getColumnLetter(dateCompletedColIndex);
      const dateRange = `'${sheetName}'!${dateColLetter}${rowIndexNum}`;
      
      if (isCompletedOrCancelled) {
        const today = new Date().toLocaleDateString('en-US');
        console.log(`📤 Setting date: ${dateRange} to "${today}"`);
        updates.push({ range: dateRange, values: [[today]] });
      } else {
        console.log(`📤 Clearing date: ${dateRange}`);
        updates.push({ range: dateRange, values: [['']] });
      }
    }

    // 3. Handle Reason for Pending - CLEAR when not Pending
    if (reasonPendingColIndex !== -1) {
      const reasonColLetter = getColumnLetter(reasonPendingColIndex);
      const reasonRange = `'${sheetName}'!${reasonColLetter}${rowIndexNum}`;
      
      if (isPending) {
        // If setting to Pending, set the reason
        const reason = reasonForPending || '';
        console.log(`📤 Setting reason for pending: "${reason}"`);
        updates.push({ range: reasonRange, values: [[reason]] });
      } else {
        // If changing from Pending to ANY other status, CLEAR the reason
        console.log(`📤 CLEARING reason for pending (status changed to: ${newStatus})`);
        updates.push({ range: reasonRange, values: [['']] });
      }
    }

    // 4. Handle Reason for Cancel
    if (reasonCancelColIndex !== -1) {
      const cancelColLetter = getColumnLetter(reasonCancelColIndex);
      const cancelRange = `'${sheetName}'!${cancelColLetter}${rowIndexNum}`;
      
      if (statusLower === 'cancelled') {
        // Keep the cancel reason if it exists
        console.log(`📤 Keeping reason for cancel`);
      } else {
        // Clear cancel reason if not cancelled
        console.log(`📤 Clearing reason for cancel`);
        updates.push({ range: cancelRange, values: [['']] });
      }
    }

    console.log(`📤 Sending batch update with ${updates.length} updates...`);
    updates.forEach((u, i) => {
      console.log(`  Update ${i + 1}: ${u.range} = ${JSON.stringify(u.values[0][0])}`);
    });

    // Execute all updates in one batch
    const result = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates,
      },
    });

    console.log('✅ Google Sheets update successful');
    console.log('📊 Total updated cells:', result.data.totalUpdatedCells);

    return NextResponse.json({ 
      success: true, 
      updatedStatus: newStatus,
      updatedRange: statusRange,
      reasonCleared: !isPending && reasonPendingColIndex !== -1,
      reasonSet: isPending && reasonPendingColIndex !== -1,
      totalUpdatedCells: result.data.totalUpdatedCells || updates.length
    });
    
  } catch (error: any) {
    console.error('❌ Error updating status:', error);
    return NextResponse.json(
      { error: `Failed to update status: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}