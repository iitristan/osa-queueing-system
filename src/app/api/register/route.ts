import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Received registration request:", body);

    const { name, email, password } = body;

    // Validate required fields
    if (!name || !email || !password) {
      console.log("Missing fields:", { name, email, password });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing user:", checkError);
      return NextResponse.json(
        { error: "Error checking user existence" },
        { status: 500 }
      );
    }

    if (existingUser) {
      console.log("User already exists:", email);
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password: hashedPassword,
        role: "user",
        online: false,
        prefix: null,
        email_verified: null,
        image: null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return NextResponse.json(
        { error: "Error creating user", details: createError.message },
        { status: 500 }
      );
    }

    if (!newUser) {
      console.error("No user data returned after creation");
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Error in user registration:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
