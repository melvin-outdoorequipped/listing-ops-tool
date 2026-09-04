// app/api/google-sheets/check-skus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spreadsheetId, skus } = body;

    if (!spreadsheetId || !skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: spreadsheetId and skus array' },
        { status: 400 }
      );
    }

    // Get credentials from environment
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      console.error('Missing Google Sheets credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google Sheets credentials' },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get list of sheets in the spreadsheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title || '') || [];
    
    // Define the sheets to search
    const sheetsToSearch = ['HH Work', 'Bekina', 'HH Sports', 'All Brands'].filter(s => sheetNames.includes(s));

    if (sheetsToSearch.length === 0) {
      return NextResponse.json({
        total: skus.length,
        found: 0,
        notFound: skus.length,
        results: skus.map(sku => ({ sku, exists: false })),
      });
    }

    // Create a Set for fast lookup
    const skuSet = new Set(skus.map(s => s.trim().toUpperCase()));
    const results: any[] = [];
    const foundMap = new Map();

    // Search each sheet
    for (const sheet of sheetsToSearch) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheet}!A:Z`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) continue;

        const headers = rows[0];
        
        // Find the V2 SKU column
        const v2SkuColumnIndex = headers.findIndex(
          (header: string) => {
            if (!header) return false;
            const h = header.toString().toLowerCase().trim();
            return h.includes('v2 sku') || h.includes('v2_sku') || h === 'v2sku';
          }
        );

        if (v2SkuColumnIndex === -1) continue;

        // Search for SKUs in this sheet
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cellValue = row[v2SkuColumnIndex]?.toString().trim().toUpperCase() || '';

          if (cellValue && skuSet.has(cellValue)) {
            // Found a match
            const rowData: Record<string, string> = {};
            headers.forEach((header, idx) => {
              if (idx < row.length) {
                const key = header?.toString() || `Column_${idx}`;
                rowData[key] = row[idx] || '';
              }
            });

            const result = {
              sku: cellValue,
              exists: true,
              sheetName: sheet,
              rowIndex: i + 1,
              v2Sku: row[v2SkuColumnIndex] || '',
              brand: rowData['Brand'] || rowData['brand'] || '',
              status: rowData['Status'] || rowData['status'] || '',
              dateRequested: rowData['Date Requested'] || rowData['date requested'] || '',
              type: rowData['Type'] || rowData['type'] || '',
              agent: rowData['Agent'] || rowData['agent'] || '',
              details: rowData,
            };

            // Store the result, preferring the first found
            if (!foundMap.has(cellValue)) {
              foundMap.set(cellValue, result);
            }
          }
        }
      } catch (err) {
        console.error(`Error reading sheet ${sheet}:`, err);
      }
    }

    // Build results for all SKUs
    const allResults = skus.map(sku => {
      const upperSku = sku.trim().toUpperCase();
      const found = foundMap.get(upperSku);
      if (found) {
        return found;
      }
      return {
        sku: sku,
        exists: false,
      };
    });

    const foundCount = allResults.filter(r => r.exists).length;
    const notFoundCount = allResults.filter(r => !r.exists).length;

    return NextResponse.json({
      total: allResults.length,
      found: foundCount,
      notFound: notFoundCount,
      results: allResults,
    });

  } catch (error) {
    console.error('Error checking SKUs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check SKUs' },
      { status: 500 }
    );
  }
}