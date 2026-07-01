import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const { spreadsheetId, sheetName, rowIndex, newDueDate, taskName, agentEmail } = await request.json();

    // Your Google Sheets auth and update logic here
    // This should update the "Due Date" column for the specified row
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating due date:', error);
    return NextResponse.json(
      { error: 'Failed to update due date' },
      { status: 500 }
    );
  }
}