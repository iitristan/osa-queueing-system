import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const officerId = searchParams.get('officer_id');

    // Try to fetch from daily_queue_stats table first
    try {
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
          date
        `)
        .eq('date', date);

      if (officerId) {
        query = query.eq('officer_id', officerId);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return NextResponse.json(data);
      }
    } catch {
      console.log("Daily stats table not available, calculating from queue data");
    }

    // Fallback: Calculate stats from queue data in real-time
    console.log("Calculating daily stats from queue data for date:", date);
    
    // Get all officers
    const { data: officers, error: officersError } = await supabase
      .from("officers")
      .select("id");

    if (officersError) {
      throw officersError;
    }

    // Get queue data for the specified date
    const { data: queueData, error: queueError } = await supabase
      .from("queue")
      .select("*")
      .gte("created_at", date)
      .lt("created_at", new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (queueError) {
      throw queueError;
    }

    // Calculate stats for each officer
    const dailyStats = officers.map(officer => {
      const officerQueues = queueData.filter(q => q.officer_id === officer.id);
      
      return {
        officer_id: officer.id,
        total_count: officerQueues.length,
        waiting_count: officerQueues.filter(q => q.status === 'waiting').length,
        served_count: officerQueues.filter(q => q.status === 'served').length,
        no_show_count: officerQueues.filter(q => q.status === 'no_show').length,
        transferred_count: officerQueues.filter(q => q.status === 'transferred').length,
        cancelled_count: officerQueues.filter(q => q.status === 'cancelled').length,
        prioritized_count: officerQueues.filter(q => q.is_prioritized && q.status === 'waiting').length,
        avg_waiting_time: 0,
        avg_consultation_time: 0,
        date: date
      };
    });

    // Filter by officer if requested
    const result = officerId 
      ? dailyStats.filter(stat => stat.officer_id === officerId)
      : dailyStats;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in daily stats route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 