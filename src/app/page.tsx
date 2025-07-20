import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const Home = async () => {
  const session = await auth();
  if (!session) redirect("/login");

  redirect("/login"); // Redirect to the login page
  return null; // This won't be rendered
};
export default Home;
