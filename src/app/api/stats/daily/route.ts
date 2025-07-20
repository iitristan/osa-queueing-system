import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]; // Default to today if no date provided
    const officerId = searchParams.get('officer_id'); // Optional parameter to filter by officer

    let query = supabase
      .from("daily_queue_stats")
      .select(`
        id, 
        officer_id,
        total_count,
        served_count,
        no_show_count,
        waiting_count, 
        transferred_count,
        cancelled_count,
        prioritized_count,
        avg_waiting_time,
        avg_consultation_time,
        date,
        officers (
          id,
          name,
          prefix,
          role,
          counter_type
        )
      `)
      .eq('date', date);

    // Filter by officer if provided
    if (officerId) {
      query = query.eq('officer_id', officerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching daily stats:", error);
      return NextResponse.json({ error: "Failed to fetch daily statistics" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in daily stats route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 