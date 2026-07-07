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

// Helper function to get Shopkeep Name (combines fields if needed)
const getShopkeepName = (row: any, config: any): string => {
  // If there's a specific name column, use it
  if (config.columns.name) {
    const name = row.get(config.columns.name)?.toString().trim();
    if (name) return name;
  }
  
  // Try to combine style number + color + size
  const styleNumber = config.columns.style_number 
    ? row.get(config.columns.style_number)?.toString().trim() || '' 
    : '';
  const color = config.columns.color 
    ? row.get(config.columns.color)?.toString().trim() || '' 
    : '';
  const size = config.columns.size 
    ? row.get(config.columns.size)?.toString().trim() || '' 
    : '';
  
  if (styleNumber || color || size) {
    let name = styleNumber || '';
    if (color) name += name ? ` ${color}` : color;
    if (size) name += name ? ` ${size}` : size;
    return name || '-';
  }
  
  return '-';
};

// Helper function to safely get SKU value with multiple column fallbacks
const getSkuValue = (row: any, config: any): string | undefined => {
  // Try primary SKU column
  if (config.columns.sku) {
    const value = row.get(config.columns.sku)?.toString().trim();
    if (value && value !== '') return value;
  }
  
  // Try alternative SKU columns
  if (config.columns.alternate_sku) {
    const value = row.get(config.columns.alternate_sku)?.toString().trim();
    if (value && value !== '') return value;
  }
  
  // Try to find any column that might contain SKU (case insensitive)
  const rowData = row._rawData || row;
  const allKeys = Object.keys(rowData);
  
  for (const key of allKeys) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('sku') || keyLower.includes('item code') || keyLower.includes('style')) {
      const value = row.get(key)?.toString().trim();
      if (value && value !== '') {
        console.log(`Found SKU in column: "${key}" with value: "${value}"`);
        return value;
      }
    }
  }
  
  return undefined;
};

// Get all column names from a row for debugging
const getColumnNames = (row: any): string[] => {
  try {
    const rowData = row._rawData || row;
    return Object.keys(rowData);
  } catch {
    return [];
  }
};

export async function POST(req: Request) {
  try {
    const { skus, userId } = await req.json();
    
    if (!userId) {
      console.error('No userId provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
    // Split by newline, trim, and remove empty lines
    const skuArray = skus.split(/\r?\n/)
      .map((sku: string) => sku.trim().toUpperCase())
      .filter(Boolean);

    if (skuArray.length === 0) {
      return NextResponse.json({ error: 'No SKUs provided' }, { status: 400 });
    }

    console.log(`\n🚀 Processing ${skuArray.length} SKUs:`, skuArray.slice(0, 5));

    const consolidatedData: any[] = [];
    const brandsFound = new Set<string>();
    const matchedSkus = new Set<string>();
    const failedBrands: string[] = [];
    const debugInfo: any[] = [];

    // Loop through each brand configuration
    for (const config of brandConfigs) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📁 Processing ${config.brandName}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`SKU Column: "${config.columns.sku}"`);
        
        const doc = await getGoogleSheet(config.spreadsheetId);
        
        // Try to get the specific sheet
        let sheet = doc.sheetsByTitle[config.sheetName as string];
        if (!sheet) {
          console.log(`⚠️ Sheet "${config.sheetName}" not found, using first sheet`);
          const sheetTitles = Object.keys(doc.sheetsByTitle);
          console.log(`Available sheets: ${sheetTitles.join(', ')}`);
          sheet = doc.sheetsByIndex[0];
        }
        
        if (!sheet) {
          console.error(`❌ No sheet found for ${config.brandName}`);
          failedBrands.push(`${config.brandName} (no sheet found)`);
          continue;
        }
        
        console.log(`✅ Found sheet: "${sheet.title}"`);
        
        const rows = await sheet.getRows();
        console.log(`📊 Total rows in sheet: ${rows.length}`);
        
        // Get column headers from the first row for debugging
        if (rows.length > 0) {
          const headers = getColumnNames(rows[0]);
          console.log(`📋 Column headers: ${headers.join(', ')}`);
        }
        
        let brandMatchCount = 0;
        let rowsChecked = 0;
        const allSheetSkus: string[] = [];

        // Check each row
        for (const row of rows) {
          rowsChecked++;
          const rowSku = getSkuValue(row, config);
          
          if (rowSku) {
            const normalizedSku = rowSku.toUpperCase().trim();
            allSheetSkus.push(normalizedSku);
            
            // Check if this SKU is in the user's list
            if (skuArray.includes(normalizedSku)) {
              brandMatchCount++;
              brandsFound.add(config.brandName);
              matchedSkus.add(normalizedSku);
              
              // Build the data object with all fields
              const dataRow: any = {
                Brand: config.brandName || 'Unknown Brand',
                SKU: rowSku,
                UPC: getSafeColumnValue(row, config.columns.upc),
                Shopkeep_Name: getShopkeepName(row, config),
                Style_Number: getSafeColumnValue(row, config.columns.style_number),
                Description: getSafeColumnValue(row, config.columns.description),
                Color: getSafeColumnValue(row, config.columns.color),
                Color_Code: getSafeColumnValue(row, config.columns.color_code),
                Size: getSafeColumnValue(row, config.columns.size),
                Gender: getSafeColumnValue(row, config.columns.gender),
              };

              // Add additional fields if they exist in the sheet
              // For Royal Robbins: PO #, Unit price, MSRP, Discount, Disc. pct.
              if (config.brandName === "Royal Robbins") {
                dataRow.PO_Number = getSafeColumnValue(row, "PO #");
                dataRow.Unit_Price = getSafeColumnValue(row, "Unit price");
                dataRow.MSRP = getSafeColumnValue(row, "MSRP");
                dataRow.Discount = getSafeColumnValue(row, "Discount");
                dataRow.Discount_Pct = getSafeColumnValue(row, "Disc. pct.");
              }

              consolidatedData.push(dataRow);
              console.log(`  ✅ Matched SKU: ${rowSku}`);
            }
          }
        }
        
        // Log sample SKUs from this sheet
        if (allSheetSkus.length > 0) {
          console.log(`📋 Sample SKUs from ${config.brandName} (first 10):`, allSheetSkus.slice(0, 10));
        }
        
        console.log(`📊 Found ${brandMatchCount} matches for ${config.brandName} (checked ${rowsChecked} rows)`);
        
        debugInfo.push({
          brand: config.brandName,
          rowsChecked,
          matchesFound: brandMatchCount,
          sampleSkus: allSheetSkus.slice(0, 5),
          totalSkusInSheet: allSheetSkus.length,
        });
        
      } catch (sheetError: any) {
        console.error(`❌ Failed to process sheet for ${config.brandName}:`, sheetError.message);
        failedBrands.push(`${config.brandName} (${sheetError.message || 'Unknown error'})`);
        continue;
      }
    }

    // Log summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 PROCESSING SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Total SKUs requested: ${skuArray.length}`);
    console.log(`Matches found: ${matchedSkus.size}`);
    console.log(`Brands found: ${Array.from(brandsFound).join(', ') || 'None'}`);
    console.log(`Consolidated rows: ${consolidatedData.length}`);

    // Generate filename
    let filename = 'Consolidated_SKUs.xlsx';
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    
    if (consolidatedData.length === 0) {
      filename = `No_Matches_${date}_${time}.xlsx`;
      
      // Add headers with debug info
      const headers: any = {
        Brand: '⚠️ NO MATCHES FOUND',
        SKU: 'Please check SKU format',
        UPC: 'Make sure SKUs match the sheet',
        Shopkeep_Name: 'Check column names',
        Style_Number: 'Case sensitivity matters',
        Description: `Total SKUs requested: ${skuArray.length}`,
        Color: `Brands checked: ${brandConfigs.length}`,
        Color_Code: `Brands with data: ${brandsFound.size}`,
        Size: `Failed brands: ${failedBrands.length}`,
        Gender: '---'
      };
      consolidatedData.push(headers);
    }

    // Create Excel workbook
    const worksheet = xlsx.utils.json_to_sheet(consolidatedData);
    
    // Set column widths
    const colWidths = [
      { wch: 20 }, // Brand
      { wch: 25 }, // SKU
      { wch: 18 }, // UPC
      { wch: 30 }, // Shopkeep_Name
      { wch: 18 }, // Style_Number
      { wch: 40 }, // Description
      { wch: 15 }, // Color
      { wch: 15 }, // Color_Code
      { wch: 12 }, // Size
      { wch: 12 }, // Gender
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Consolidated SKUs");

    // Generate buffer
    const buf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return the file
    const brandsArray = Array.from(brandsFound);
    const matchCount = matchedSkus.size;

    console.log(`\n✅ Processing complete: ${matchCount} matched`);

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Brands-Found': JSON.stringify(brandsArray),
        'X-Match-Count': matchCount.toString(),
        'X-Total-Requested': skuArray.length.toString(),
        'X-User-Id': userId,
        'X-Failed-Brands': JSON.stringify(failedBrands),
        'X-Debug-Info': JSON.stringify(debugInfo),
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