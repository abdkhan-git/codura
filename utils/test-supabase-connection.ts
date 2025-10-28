// Test Supabase connection and authentication
import { createClient } from '@/utils/supabase/client';

export function testSupabaseConnection() {
  const supabase = createClient();
  
  console.log('🔍 Testing Supabase connection...');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...');
  
  // Test authentication
  supabase.auth.getUser().then(({ data: { user }, error }) => {
    if (error) {
      console.error('❌ Authentication error:', error);
    } else if (user) {
      console.log('✅ User authenticated:', user.id);
    } else {
      console.log('⚠️ No user authenticated');
    }
  });
  
  // Test basic real-time connection
  const channel = supabase.channel('test-connection');
  
  channel
    .on('broadcast', { event: 'test' }, (payload) => {
      console.log('✅ Broadcast test received:', payload);
    })
    .subscribe((status) => {
      console.log('🔗 Test channel status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Basic real-time connection successful!');
        
        // Test postgres_changes subscription
        const testChannel = supabase.channel('test-postgres');
        testChannel
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'messages'
          }, (payload) => {
            console.log('📨 Postgres changes test received:', payload);
          })
          .subscribe((pgStatus) => {
            console.log('📨 Postgres changes subscription status:', pgStatus);
            
            if (pgStatus === 'SUBSCRIBED') {
              console.log('✅ Postgres changes subscription successful!');
            } else if (pgStatus === 'CHANNEL_ERROR') {
              console.error('❌ Postgres changes subscription failed:', pgStatus);
            }
          });
          
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Basic real-time connection failed:', status);
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️ Real-time connection timeout:', status);
      }
    });
    
  return channel;
}
