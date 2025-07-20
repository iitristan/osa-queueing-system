import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface QueueItem {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  officer_id: string;
}

interface DailyStats {
  total_count: number;
  waiting_count: number;
  served_count: number;
  no_show_count: number;
  transferred_count: number;
  prioritized_count: number;
  date: string;
  avg_queue_time: number;
  longest_queue_time: number;
  shortest_queue_time: number;
}

async function fetchStatsWithRetry(): Promise<QueueItem[]> {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const { data, error } = await supabase
        .from("queue")
        .select("*")
        .gte("created_at", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Attempt ${retries + 1} failed:`, error);
      retries++;
      if (retries === MAX_RETRIES) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  return [];
}

function calculateQueueTimes(items: QueueItem[]): {
  avgQueueTime: number;
  longestQueueTime: number;
  shortestQueueTime: number;
} {
  const completedItems = items.filter(
    item => item.status === 'served' && item.updated_at
  );

  if (completedItems.length === 0) {
    return {
      avgQueueTime: 0,
      longestQueueTime: 0,
      shortestQueueTime: 0
    };
  }

  const queueTimes = completedItems.map(item => {
    const start = new Date(item.created_at).getTime();
    const end = new Date(item.updated_at!).getTime();
    return end - start;
  });

  const totalTime = queueTimes.reduce((sum, time) => sum + time, 0);
  const avgQueueTime = totalTime / queueTimes.length;
  const longestQueueTime = Math.max(...queueTimes);
  const shortestQueueTime = Math.min(...queueTimes);

  return {
    avgQueueTime,
    longestQueueTime,
    shortestQueueTime
  };
}

export async function GET() {
  try {
    const items = await fetchStatsWithRetry();
    const { avgQueueTime, longestQueueTime, shortestQueueTime } = calculateQueueTimes(items);

    // Group items by officer_id
    const statsByOfficer = items.reduce((acc: Record<string, DailyStats>, item) => {
      const date = item.created_at.split("T")[0];
      const officerId = item.officer_id;

      if (!acc[officerId]) {
        acc[officerId] = {
          total_count: 0,
          waiting_count: 0,
          served_count: 0,
          no_show_count: 0,
          transferred_count: 0,
          prioritized_count: 0,
          date,
          avg_queue_time: avgQueueTime,
          longest_queue_time: longestQueueTime,
          shortest_queue_time: shortestQueueTime
        };
      }

      acc[officerId].total_count++;
      if (item.status === "waiting") acc[officerId].waiting_count++;
      if (item.status === "served") acc[officerId].served_count++;
      if (item.status === "no_show") acc[officerId].no_show_count++;
      if (item.status === "transferred") acc[officerId].transferred_count++;

      return acc;
    }, {});

    return NextResponse.json(statsByOfficer);
  } catch (error) {
    console.error("Error in queue stats API:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch queue stats",
        details: error instanceof Error ? error.message : "Unknown error",
        hint: "Please check the server logs for more details",
        code: "QUEUE_STATS_ERROR"
      },
      { status: 500 }
    );
  }
} 