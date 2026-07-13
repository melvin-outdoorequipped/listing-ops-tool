// lib/notification-helper.ts (Updated - no status filter)
import { supabase } from '@/lib/supabase/client';
import { createNotification, Notification } from './notification-service';

export const notifyAllUsers = async (
  title: string,
  message: string,
  type: Notification['type'],
  data?: any,
  agentInfo?: {
    id: string;
    name: string;
    email: string;
  },
  toolContext?: any,
  excludeUserId?: string
) => {
  try {
    console.log('📬 ===== STARTING notifyAllUsers =====');
    console.log('📬 Title:', title);
    console.log('📬 Type:', type);
    console.log('📬 ExcludeUserId:', excludeUserId);
    console.log('📬 AgentInfo:', agentInfo);
    
    // ✅ Get ALL users from profiles (NO status filter)
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, name');

    if (error) {
      console.error('❌ Error fetching users:', error);
      console.log('📬 Trying to get users from auth.users as fallback...');
      
      const { data: authUsers, authError } = await supabase
        .from('auth.users')
        .select('id, email');
      
      if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return [];
      }
      
      if (!authUsers || authUsers.length === 0) {
        console.warn('⚠️ No users found in auth.users');
        return [];
      }
      
      console.log(`📬 Found ${authUsers.length} users from auth.users`);
      
      const results = [];
      for (const user of authUsers) {
        if (excludeUserId && user.id === excludeUserId) {
          console.log(`⏭️ Skipping ${user.email} (excluded)`);
          continue;
        }
        
        console.log(`📨 Creating notification for ${user.email}...`);
        
        const result = await createNotification(
          user.id,
          title,
          message,
          type,
          data,
          agentInfo,
          toolContext
        );
        
        if (result) {
          results.push(result);
          console.log(`✅ Notification created for ${user.email}`);
        }
      }
      
      console.log(`✅ Successfully created ${results.length} notifications`);
      return results;
    }

    console.log('📬 All users from profiles:', users.map(u => u.email));

    if (!users || users.length === 0) {
      console.warn('⚠️ No users found in profiles');
      return [];
    }

    // ✅ Use ALL users, don't filter by status
    console.log(`📬 Found ${users.length} total users to notify`);

    const results = [];
    
    for (const user of users) {
      // Skip the user who performed the action
      if (excludeUserId && user.id === excludeUserId) {
        console.log(`⏭️ Skipping ${user.email} (excluded - they already know)`);
        continue;
      }
      
      console.log(`📨 Creating notification for ${user.email}...`);
      
      const result = await createNotification(
        user.id,
        title,
        message,
        type,
        data,
        agentInfo,
        toolContext
      );
      
      if (result) {
        results.push(result);
        console.log(`✅ Notification created for ${user.email}`);
      } else {
        console.log(`❌ Failed to create notification for ${user.email}`);
      }
    }
    
    console.log(`✅ Successfully created ${results.length} notifications for other users`);
    console.log('📬 ===== END notifyAllUsers =====');
    return results;
  } catch (error) {
    console.error('❌ Error notifying all users:', error);
    return [];
  }
};