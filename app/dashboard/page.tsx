// app/dashboard/page.tsx
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from '../components/dashboard';

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

async function getTasksFromSheet(userEmail: string) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Missing Google credentials');
      return [];
    }

    if (!userEmail) {
      console.log('⚠️ No user email provided');
      return [];
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A:Z`,
      majorDimension: 'ROWS',
    });

    const values = response.data.values || [];
    if (values.length < 2) {
      console.log('📊 No data rows found in sheet');
      return [];
    }

    const headers = values[0];
    const agentCol = headers.findIndex(
      (h: string) => h?.toString().trim().toLowerCase() === 'agent'
    );

    if (agentCol === -1) {
      console.error('⚠️ Agent column not found in headers:', headers);
      return [];
    }

    // Get the target agent name from the email
    const emailLower = userEmail.toLowerCase().trim();
    const targetAgent = TEAM_MEMBERS[emailLower] || emailLower.split('@')[0];
    const targetAgentLower = targetAgent.toLowerCase().trim();
    
    console.log(`🔍 Server-side filtering for agent: "${targetAgentLower}" (from email: ${emailLower})`);

    // Filter rows
    const filteredRows = values.slice(1).filter((row: any[]) => {
      const agentValue = row[agentCol]?.toString().trim() || '';
      const agentLower = agentValue.toLowerCase();
      
      // Exact match
      if (agentLower === targetAgentLower) {
        return true;
      }
      
      // Check if agent name maps to this user's email
      for (const [email, name] of Object.entries(TEAM_MEMBERS)) {
        if (email === emailLower && name.toLowerCase() === agentLower) {
          return true;
        }
      }
      
      return false;
    });

    console.log(`📊 Server-side filter: ${filteredRows.length} tasks for "${targetAgent}"`);

    if (filteredRows.length === 0) {
      // Log some sample agent names for debugging
      console.log('⚠️ No tasks found. Sample agent names in sheet:',
        values.slice(1, 5).map(row => row[agentCol]?.toString().trim())
      );
    }

    return [headers, ...filteredRows];
  } catch (error) {
    console.error('Error fetching tasks from Google Sheets:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const currentUserEmail = session?.user?.email || '';
  const currentUserName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    '';

  console.log(`👤 User logged in: ${currentUserEmail} (${currentUserName})`);

  // Fetch tasks already filtered to this user
  const initialTasks = await getTasksFromSheet(currentUserEmail);

  return (
    <DashboardClient
      initialTasks={initialTasks}
      theme="dark"
      currentUserEmail={currentUserEmail}
      currentUserName={currentUserName}
    />
  );
}