import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId } = body;
    
    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Three methods to ensure the value gets set properly
    
    // 1. Raw SQL update
    try {
      await supabase.rpc('execute_sql', {
        sql_query: `UPDATE queue SET is_prioritized = TRUE::boolean, 
                               priority_timestamp = NOW() 
                 WHERE id = '${itemId}'`
      });
    } catch (error) {
      console.log('Raw SQL method failed, trying next method');
    }
    
    // 2. Another direct SQL approach
    try {
      await supabase.rpc('execute_sql', {
        sql_query: `UPDATE queue SET is_prioritized = 't'::boolean, 
                                priority_timestamp = NOW() 
                  WHERE id = '${itemId}'`
      });
    } catch (error) {
      console.log('Second SQL method failed, trying next method');
    }
    
    // 3. Standard update with service role
    const { error } = await supabase
      .from('queue')
      .update({ 
        is_prioritized: true, 
        priority_timestamp: new Date().toISOString() 
      })
      .eq('id', itemId);

    if (error) {
      console.error('Standard update failed:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }

    // 4. Verify the update
    const { data: verification, error: verificationError } = await supabase
      .from('queue')
      .select('is_prioritized')
      .eq('id', itemId)
      .single();
    
    if (verificationError) {
      console.error('Verification failed:', verificationError);
    }
    
    return NextResponse.json({ 
      success: true, 
      verification: verification,
      message: 'All methods attempted, check logs for errors'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 