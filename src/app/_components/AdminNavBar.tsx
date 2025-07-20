"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNavBar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/admin" className="text-xl font-bold text-gray-900">
              OSA Admin
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/admin"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/admin")
                  ? "text-[#FCBF15] border-b-2 border-[#FCBF15]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/officers"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/admin/officers")
                  ? "text-[#FCBF15] border-b-2 border-[#FCBF15]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Officers
            </Link>
            <Link
              href="/admin/queue"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/admin/queue")
                  ? "text-[#FCBF15] border-b-2 border-[#FCBF15]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Queue
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 