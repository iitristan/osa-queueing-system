import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: officer, error } = await supabase
      .from("officers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch officer" },
        { status: 500 }
      );
    }

    if (!officer) {
      return NextResponse.json(
        { error: "Officer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(officer);
  } catch (error) {
    console.error("Error fetching officer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 