import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Fetch officers
    const { data: officers, error: officersError } = await supabase
      .from("officers")
      .select(`
        id,
        prefix,
        role,
        counter_type,
        online,
        user_id
      `)
      .order("prefix", { ascending: true });

    if (officersError) {
      console.error("Error fetching officers:", officersError);
      return NextResponse.json({ error: "Failed to fetch officers" }, { status: 500 });
    }

    // Fetch users separately to get names
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", officers?.map(o => o.user_id).filter(Boolean) || []);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Create a map of user_id to user data
    const userMap = new Map(users?.map(user => [user.id, user]) || []);

    // Fetch all queue items
    const { data: queueItems, error: queueError } = await supabase
      .from("queue")
      .select("*")
      .order("created_at", { ascending: true });

    if (queueError) {
      console.error("Error fetching queue items:", queueError);
      return NextResponse.json({ error: "Failed to fetch queue items" }, { status: 500 });
    }

    // Fetch queue counters
    const { data: queueCounters, error: countersError } = await supabase
      .from("queue_counters")
      .select("*");

    if (countersError) {
      console.error("Error fetching queue counters:", countersError);
      return NextResponse.json({ error: "Failed to fetch queue counters" }, { status: 500 });
    }

    // Transform officers data to match expected format
    const transformedOfficers = officers?.map(officer => {
      const user = userMap.get(officer.user_id);
      return {
        id: officer.id,
        name: user?.name || `Officer ${officer.prefix}`,
        online: officer.online,
        prefix: officer.prefix,
        role: officer.role,
        counter_type: officer.counter_type
      };
    }) || [];

    // Transform queue counters to expected format
    const transformedCounters = queueCounters?.reduce((acc, counter) => {
      acc[counter.officer_id] = counter.counter;
      return acc;
    }, {} as Record<string, number>) || {};

    // Transform queue items to include proper number formatting
    const transformedQueueItems = queueItems?.map(item => ({
      ...item,
      number: item.number.toString() // Ensure number is a string for display
    })) || [];

    return NextResponse.json({
      queueItems: transformedQueueItems,
      queueCounters: transformedCounters,
      officers: transformedOfficers,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in queue route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { officer_id, number } = data;

    if (!officer_id || !number) {
      return NextResponse.json(
        { error: "Officer ID and number are required" },
        { status: 400 }
      );
    }

    // Create new queue item
    const { error: queueError } = await supabase.from("queue").insert([{
      officer_id,
      number: parseInt(number),
      status: "waiting"
    }]);

    if (queueError) {
      console.error("Error creating queue item:", queueError);
      return NextResponse.json(
        { error: "Failed to create queue item" },
        { status: 500 }
      );
    }

    // Update counter
    const { error: counterError } = await supabase
      .from("queue_counters")
      .upsert({ officer_id, counter: parseInt(number) + 1 });

    if (counterError) {
      console.error("Error updating counter:", counterError);
      return NextResponse.json(
        { error: "Failed to update counter" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in queue route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
