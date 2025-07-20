import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Function to add columns if they don't exist
export async function updateSchema() {
  if (process.env.NODE_ENV !== "development") return;

  try {
    // Check if role and counter_type columns exist in officers table
    const { data: officersColumns } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "officers");

    const hasRole = officersColumns?.some((col) => col.column_name === "role");
    const hasCounterType = officersColumns?.some(
      (col) => col.column_name === "counter_type"
    );

    // Add role and counter_type columns if they don't exist
    if (!hasRole) {
      await supabase.rpc("add_role_column");
    }
    if (!hasCounterType) {
      await supabase.rpc("add_counter_type_column");
    }

    // Check if is_prioritized column exists in queue table
    const { data: queueColumns } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "queue");

    const hasIsPrioritized = queueColumns?.some(
      (col) => col.column_name === "is_prioritized"
    );

    // Add is_prioritized column if it doesn't exist
    if (!hasIsPrioritized) {
      await supabase.rpc("add_is_prioritized_column");
    }
  } catch (error) {
    console.error("Error updating schema:", error);
  }
}

// Only run the schema update in development or when explicitly called
if (process.env.NODE_ENV === 'development') {
  updateSchema();
}
