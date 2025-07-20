"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { FiClock, FiUsers, FiLogOut, FiBarChart2 } from "react-icons/fi";
import { useRouter, usePathname } from "next/navigation";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getButtonStyle = (path: string) => {
    return `flex items-center space-x-2 px-3 py-2 transition-colors ${
      isActive(path)
        ? "text-[#FCBF15] border-b-2 border-[#FCBF15]"
        : "text-white hover:text-[#FCBF15]"
    }`;
  };

  return (
    <header className="relative z-50">
      <nav className="bg-[#111111] border-b-4 border-[#FCBF15]">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Image
              src="/osa_header.png"
              alt="UST Logo"
              width={350}
              height={100}
              className="p-3"
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.replace("/admin")}
                className={getButtonStyle("/admin")}
              >
                <FiUsers className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => router.replace("/admin/officers")}
                className={getButtonStyle("/admin/officers")}
              >
                <FiUsers className="w-5 h-5" />
                <span>Officers</span>
              </button>
              <button
                onClick={() => router.replace("/reports")}
                className={getButtonStyle("/reports")}
              >
                <FiBarChart2 className="w-5 h-5" />
                <span>Reports</span>
              </button>
              <button
                onClick={() => window.open("/display", "_blank")}
                className={getButtonStyle("/display")}
              >
                <FiClock className="w-5 h-5" />
                <span>Queue Display</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {session?.user?.email && (
              <>
                <span className="text-white text-sm">{session.user.email}</span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center space-x-2 text-white px-3 py-2 hover:text-red-400 transition-colors"
                >
                  <FiLogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
