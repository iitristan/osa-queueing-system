import { hash } from "bcrypt";
import { supabase } from "../src/lib/supabase";

async function createDevUser() {
  try {
    // Check if dev user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", "dev@ust.edu.ph")
      .single();

    if (existingUser) {
      console.log("Dev user already exists");
      return;
    }

    // Hash password
    const hashedPassword = await hash("devpass123", 10);

    // Create dev user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        name: "Development User",
        email: "dev@ust.edu.ph",
        password: hashedPassword,
        role: "admin", // Give admin access for development
        online: false,
        prefix: null,
        email_verified: new Date().toISOString(),
        image: null,
        access: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log("Dev user created successfully:", newUser);
  } catch (error) {
    console.error("Error creating dev user:", error);
  }
}

createDevUser(); 