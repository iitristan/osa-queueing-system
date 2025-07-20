import Providers from "./providers";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const session = await getServerSession();
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* {!!session && <span>Logout</span>}
        {!session && <Link href="/login">Login</Link>} */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
