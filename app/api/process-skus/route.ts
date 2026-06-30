// app/api/process-skus/route.ts
import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { brandConfigs } from '../../../config/brandConfig';
import { getGoogleSheet } from '../../../lib/googleSheets';

// Helper function to get value or return dash
const getValueOrDash = (value: any): string => {
  const cleaned = value?.toString().trim();
  return cleaned && cleaned !== '' ? cleaned : '-';
};

// Helper function to safely get column value
const getSafeColumnValue = (row: any, columnName: string | undefined): string => {
  if (!columnName) return '-';
  return getValueOrDash(row.get(columnName));
};

// Helper function to safely get SKU value
const getSkuValue = (row: any, columnName: string | undefined): string | undefined => {
  if (!columnName) return undefined;
  const value = row.get(columnName)?.toString().trim();
  return value && value !== '' ? value : undefined;
};

export async function POST(req: Request) {
  try {
    const { skus, userId } = await req.json();
    
    if (!userId) {
      console.error('No userId provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
    // Split by newline, trim, and remove empty lines (supports both \n and \r\n)
    const skuArray = skus.split(/\r?\n/)
      .map((sku: string) => sku.trim())
      .filter(Boolean); // removes empty strings

    if (skuArray.length === 0) {
      return NextResponse.json({ error: 'No SKUs provided' }, { status: 400 });
    }

    const consolidatedData: any[] = [];
    const brandsFound = new Set<string>();
    const matchedSkus = new Set<string>(); // Track which SKUs were matched
    const failedBrands: string[] = []; // Track failed brands for logging

    // Loop through each brand configuration
    for (const config of brandConfigs) {
      try {
        console.log(`Processing ${config.brandName}...`);
        const doc = await getGoogleSheet(config.spreadsheetId);
        
        // Grab the specific sheet
        const sheet = doc.sheetsByTitle[config.sheetName as string] || doc.sheetsByIndex[0];
        
        if (!sheet) {
          console.error(`No sheet found for ${config.brandName}`);
          failedBrands.push(`${config.brandName} (no sheet found)`);
          continue;
        }
        
        const rows = await sheet.getRows();
        let brandMatchCount = 0;

        // Check each row in the Google Sheet against the user's requested SKUs
        for (const row of rows) {
          const rowSku = getSkuValue(row, config.columns.sku);
          
          if (rowSku && skuArray.includes(rowSku)) {
            brandMatchCount++;
            // Track which brands we found results for
            if (config.brandName) {
              brandsFound.add(config.brandName);
            }

            // Track matched SKU
            matchedSkus.add(rowSku);
            
            // Build the data object with all fields using safe column access
            const dataRow: any = {
              Brand: config.brandName || 'Unknown Brand',
              SKU: rowSku,
              UPC: getSafeColumnValue(row, config.columns.upc),
              Shopkeep_Name: getSafeColumnValue(row, config.columns.name),
              Style_Number: getSafeColumnValue(row, config.columns.style_number),
              Description: getSafeColumnValue(row, config.columns.description),
              Color: getSafeColumnValue(row, config.columns.color),
              Color_Code: getSafeColumnValue(row, config.columns.color_code),
              Size: getSafeColumnValue(row, config.columns.size),
              Gender: getSafeColumnValue(row, config.columns.gender),
            };

            consolidatedData.push(dataRow);
          }
        }
        
        console.log(`Found ${brandMatchCount} matches for ${config.brandName}`);
      } catch (sheetError: any) {
        console.error(`Failed to process sheet for ${config.brandName}:`, sheetError.message);
        failedBrands.push(`${config.brandName} (${sheetError.message || 'Unknown error'})`);
        // Continue with next brand instead of failing completely
        continue;
      }
    }

    // Log failed brands for debugging
    if (failedBrands.length > 0) {
      console.warn('Failed to process the following brands:', failedBrands);
    }

    // Generate filename based on brands found
    let filename = 'Consolidated_SKUs.xlsx';
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    
    if (consolidatedData.length === 0) {
      // No matches found - return empty worksheet with headers
      filename = `No_Matches_${date}_${time}.xlsx`;
      const headers = {
        Brand: '-',
        SKU: '-',
        UPC: '-',
        Shopkeep_Name: '-',
        Style_Number: '-',
        Description: '-',
        Color: '-',
        Color_Code: '-',
        Size: '-',
        Gender: '-'
      };
      consolidatedData.push(headers);
    } else {
      // Build filename with brands found and user ID for tracking
      const brandsList = Array.from(brandsFound).join('_');
      const userPrefix = userId.slice(0, 8); // First 8 chars of user ID
      filename = `${brandsList}_SKUs_${date}_${time}_${userPrefix}.xlsx`;
    }

    // Create Excel workbook
    const worksheet = xlsx.utils.json_to_sheet(consolidatedData);
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 15 }, // Brand
      { wch: 20 }, // SKU
      { wch: 15 }, // UPC
      { wch: 25 }, // Shopkeep_Name
      { wch: 15 }, // Style_Number
      { wch: 30 }, // Description
      { wch: 12 }, // Color
      { wch: 12 }, // Color_Code
      { wch: 10 }, // Size
      { wch: 10 }, // Gender
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Consolidated SKUs");

    // Generate buffer
    const buf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return the file as a downloadable response with metadata in custom headers
    const brandsArray = Array.from(brandsFound);
    const matchCount = matchedSkus.size;
    const unmatchedCount = skuArray.length - matchCount;

    console.log(`Processing complete: ${matchCount} matched, ${unmatchedCount} unmatched from ${skuArray.length} total SKUs`);

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Brands-Found': JSON.stringify(brandsArray),
        'X-Match-Count': matchCount.toString(),
        'X-Total-Requested': skuArray.length.toString(),
        'X-Unmatched-Count': unmatchedCount.toString(),
        'X-User-Id': userId,
        'X-Failed-Brands': JSON.stringify(failedBrands),
      },
    });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process SKUs', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}