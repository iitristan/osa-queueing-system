// Simple script to fix priority values directly in the database
// Run with: node fix_priorities.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your Supabase URL and key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPriorityValues() {
  console.log('Starting priority fix...');

  try {
    // 1. First check if priority_timestamp column exists
    console.log('Checking for priority_timestamp column...');
    try {
      const { data: columnCheck } = await supabase.rpc('execute_sql', {
        sql_query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'queue' AND column_name = 'priority_timestamp'
        `
      });
      
      console.log('Column check result:', columnCheck);
      
      // Add column if it doesn't exist
      if (!columnCheck || !columnCheck.length) {
        console.log('Adding priority_timestamp column...');
        await supabase.rpc('execute_sql', {
          sql_query: `
            ALTER TABLE queue 
            ADD COLUMN priority_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
          `
        });
      }
    } catch (e) {
      console.log('Column check failed, trying direct alter anyway');
      try {
        await supabase.rpc('execute_sql', {
          sql_query: `
            ALTER TABLE queue 
            ADD COLUMN IF NOT EXISTS priority_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
          `
        });
      } catch (alterError) {
        console.log('Adding column failed, may already exist');
      }
    }

    // 2. Force the correct data type for is_prioritized
    console.log('Fixing is_prioritized data type...');
    try {
      await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE queue 
          ALTER COLUMN is_prioritized TYPE boolean USING is_prioritized::boolean
        `
      });
    } catch (e) {
      console.log('Type conversion may have already been done:', e);
    }

    // 3. Fix all priority values
    console.log('Fixing priority values...');
    const { data: updateResult, error: updateError } = await supabase.rpc('execute_sql', {
      sql_query: `
        UPDATE queue
        SET is_prioritized = 
          CASE 
            WHEN (is_prioritized IS NULL) THEN FALSE 
            WHEN (is_prioritized::text = 'false' OR is_prioritized::text = '0' OR is_prioritized::text = 'f' OR is_prioritized::text = 'False' OR is_prioritized::text = 'FALSE') THEN FALSE
            WHEN (is_prioritized::text = 'true' OR is_prioritized::text = '1' OR is_prioritized::text = 't' OR is_prioritized::text = 'True' OR is_prioritized::text = 'TRUE') THEN TRUE
            ELSE FALSE
          END
      `
    });
    
    if (updateError) {
      console.error('Error updating priority values:', updateError);
    } else {
      console.log('Priority values fixed');
    }

    // 4. Set timestamps for prioritized items
    console.log('Setting priority_timestamp for prioritized items...');
    const { data: timestampResult, error: timestampError } = await supabase.rpc('execute_sql', {
      sql_query: `
        UPDATE queue
        SET priority_timestamp = NOW()
        WHERE is_prioritized = TRUE AND (priority_timestamp IS NULL)
      `
    });

    if (timestampError) {
      console.error('Error setting priority timestamps:', timestampError);
    } else {
      console.log('Priority timestamps set');
    }

    // 5. Verify the changes
    console.log('Verifying changes...');
    const { data: verifyResult, error: verifyError } = await supabase
      .from('queue')
      .select('id, is_prioritized, priority_timestamp')
      .limit(10);

    if (verifyError) {
      console.error('Error verifying changes:', verifyError);
    } else {
      console.log('Sample of queue items after fix:');
      console.table(verifyResult);
    }

    console.log('Priority fix completed!');
  } catch (error) {
    console.error('Global error in fix script:', error);
  }
}

// Run the fix
fixPriorityValues(); 