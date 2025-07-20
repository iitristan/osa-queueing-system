import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("queue_counters")
      .select("*")
      .order("last_reset", { ascending: false });

    if (error) {
      console.error("Error fetching queue counters:", error);
      return NextResponse.json({});
    }

    // Transform Supabase data to match the original format
    const transformedData = data.reduce((acc, counter) => {
      acc[counter.officer_id] = counter.counter;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error in queue counters route:", error);
    return NextResponse.json({});
  }
} 