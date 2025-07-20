import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const initialOfficers = [
  { id: "o1", name: "Benedict", online: true, prefix: "B" },
  { id: "o2", name: "John", online: false, prefix: "J" },
  { id: "o3", name: "Alex", online: true, prefix: "A" },
  { id: "o4", name: "Mary", online: true, prefix: "M" },
  { id: "o5", name: "Patricia", online: true, prefix: "P" },
  { id: "o6", name: "Robert", online: true, prefix: "R" },
  { id: "o7", name: "Michael", online: true, prefix: "M" },
  { id: "o8", name: "William", online: true, prefix: "W" },
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("officers")
      .select(`
        *,
        user:users(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching officers:", error);
      return NextResponse.json(initialOfficers);
    }

    // Transform Supabase data to match the original format
    const transformedData = data.map(officer => ({
      id: officer.id,
      name: officer.user.name,
      online: officer.online,
      prefix: officer.prefix
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error in officers route:", error);
    return NextResponse.json(initialOfficers);
  }
} 