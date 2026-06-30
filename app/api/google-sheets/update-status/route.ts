// /app/api/google-sheets/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Catch unhandled errors to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

function getColumnLetter(colIndex: number) {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

async function getHeaders(sheets: any, spreadsheetId: string, sheetName: string) {
  try {
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    return headers;
  } catch (error: any) {
    console.error('❌ Error fetching headers:', error);
    throw new Error(`Failed to fetch sheet headers: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 Update status API called');
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('📝 Request body:', JSON.stringify(body, null, 2));

    const { spreadsheetId, sheetName, rowIndex, newStatus, taskName, agentEmail } = body;

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
    if (rowIndex === undefined || rowIndex === null || rowIndex === 0) {
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

    // Ensure rowIndex is a number
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
    
    // Create a NEW auth instance for each request
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
    const headers = await getHeaders(sheets, spreadsheetId, sheetName);
    console.log('📊 Headers found:', headers);

    // Find the Status column
    let statusColIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.toString().trim().toLowerCase();
      if (header === 'status') {
        statusColIndex = i;
        break;
      }
    }

    if (statusColIndex === -1) {
      console.error('❌ Status column not found. Available headers:', headers);
      return NextResponse.json(
        { error: `Status column not found. Available headers: ${headers.join(', ')}` },
        { status: 400 }
      );
    }

    // Find the Date Completed column
    let dateCompletedColIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.toString().trim().toLowerCase();
      if (header === 'date completed') {
        dateCompletedColIndex = i;
        break;
      }
    }

    const statusColLetter = getColumnLetter(statusColIndex);
    const rangeToUpdate = `'${sheetName}'!${statusColLetter}${rowIndexNum}`;
    console.log(`📤 Updating range: ${rangeToUpdate} to "${newStatus}"`);

    // Build updates array
    const updates: { range: string; values: any[][] }[] = [
      { range: rangeToUpdate, values: [[newStatus]] },
    ];

    // Handle Date Completed column based on status
    const statusLower = newStatus.toLowerCase();
    const isCompletedOrCancelled = statusLower === 'completed' || statusLower === 'cancelled';

    if (dateCompletedColIndex !== -1) {
      const dateColLetter = getColumnLetter(dateCompletedColIndex);
      const dateRange = `'${sheetName}'!${dateColLetter}${rowIndexNum}`;
      
      if (isCompletedOrCancelled) {
        // When marking as Completed or Cancelled, set the date
        const today = new Date().toISOString().split('T')[0];
        console.log(`📤 Setting date range: ${dateRange} to "${today}"`);
        updates.push({ range: dateRange, values: [[today]] });
      } else {
        // When reverting from Completed/Cancelled to something else, clear the date
        console.log(`📤 Clearing date range: ${dateRange}`);
        // Use empty string to clear the date
        updates.push({ range: dateRange, values: [['']] });
      }
    }

    // Execute the update using batchUpdate
    try {
      console.log(`📤 Sending batch update to Google Sheets with ${updates.length} updates...`);
      
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
        updatedRange: rangeToUpdate,
        dateUpdated: isCompletedOrCancelled ? new Date().toISOString().split('T')[0] : 'cleared',
        totalUpdatedCells: result.data.totalUpdatedCells || updates.length
      });
      
    } catch (googleError: any) {
      console.error('❌ Google Sheets API error:', googleError);
      console.error('Error details:', googleError.response?.data);
      
      // If batch update fails, try updating just the status
      if (googleError.message && googleError.message.includes('batchUpdate')) {
        console.log('🔄 Retrying with single status update only...');
        try {
          const retryResult = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: rangeToUpdate,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[newStatus]],
            },
          });
          
          return NextResponse.json({ 
            success: true, 
            updatedStatus: newStatus,
            updatedRange: rangeToUpdate,
            note: 'Status updated, date column not modified',
            updatedCells: retryResult.data.updatedCells || 1
          });
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
          return NextResponse.json(
            { 
              error: `Failed to update: ${googleError.message || 'Unknown error'}`,
              details: googleError.response?.data || null
            },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json(
        { 
          error: `Google Sheets API error: ${googleError.message || 'Unknown error'}`,
          details: googleError.response?.data || null
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { 
        error: `Unexpected error: ${error.message || 'Unknown error'}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}