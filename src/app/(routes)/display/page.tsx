"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FaUser,
  FaTable,
  FaListAlt,
  FaArrowRight,
  FaTv,
  FaClock,
  FaFileAlt,
  FaQrcode,
} from "react-icons/fa";
import { useEffect, useState } from "react";
import useSWR from "swr";

interface Officer {
  id: string;
  name: string;
  online: boolean;
  prefix: string;
  role: string;
  counter_type: string;
}

interface QueueItem {
  id: string;
  officer_id: string;
  number: string;
  status: string;
  created_at: string;
  updated_at?: string;
  is_prioritized: boolean;
  priority_timestamp?: string;
  waiting_start_time: string;
  consultation_start_time?: string;
  consultation_end_time?: string;
  total_waiting_time: number;
  total_consultation_time: number;
  full_name?: string;
  college?: string;
}

interface QueueData {
  queueItems: QueueItem[];
  queueCounters: Record<string, number>;
  officers: Officer[];
  lastUpdated: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data } = useSWR<QueueData>("/api/queue", fetcher, {
    refreshInterval: 1000,
  });

  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get currently serving queue items (status = 'served')
  const getCurrentlyServing = () => {
    if (!data?.queueItems || !data?.officers) return [];

    return data.queueItems
      .filter(item => item.status === 'served')
      .map(item => {
        const officer = data.officers.find(o => o.id === item.officer_id);
        return {
          ...item,
          officer,
          displayNumber: `${officer?.prefix || ''}${item.number}`
        };
      })
      .filter(item => item.officer?.online)
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  };

  // Get latest currently serving item
  const latestServing = getCurrentlyServing()[0];

  // Get active queues for display (waiting items for online officers)
  const getActiveQueues = () => {
    if (!data?.queueItems || !data?.officers) return [];

    const onlineOfficers = data.officers.filter(o => o.online);
    
    return onlineOfficers.map(officer => {
      // Get the next waiting item for this officer
      const nextItem = data.queueItems
        .filter(item => 
          item.officer_id === officer.id && 
          item.status === 'waiting'
        )
        .sort((a, b) => {
          // Prioritized items come first
          if (a.is_prioritized && !b.is_prioritized) return -1;
          if (!a.is_prioritized && b.is_prioritized) return 1;
          
          // Then by creation time
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })[0];

      return {
        officer,
        nextItem,
        displayNumber: nextItem ? `${officer.prefix}${nextItem.number}` : '--'
      };
    })
    .filter(queue => queue.nextItem) // Only show officers with waiting items
    .sort((a, b) => a.officer.name.localeCompare(b.officer.name))
    .slice(0, 5); // Limit to 5 items for display
  };

  const activeQueues = getActiveQueues();

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2c3e50] text-white">
      <nav className="flex-shrink-0 bg-[#111111] border-[#FCBF15] border-b-4 flex justify-between items-center p-4">
        <Link href="/admin">
          <div>
            <Image
              src="/osa_header.png"
              alt="UST Logo"
              width={500}
              height={200}
              className="hover:opacity-90 transition-opacity w-auto h-auto max-h-[80px]"
              priority
            />
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <FaClock className="text-2xl text-[#FCBF15]" />
          <span className="text-2xl font-semibold text-[#FCBF15]">
            {currentTime}
          </span>
        </div>
      </nav>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Now Serving Section */}
        <div className="flex flex-col gap-4 h-full min-h-0">
          <div className="flex-1 flex flex-col justify-center items-center bg-[#2c3e50] rounded-lg shadow-2xl p-4 md:p-8 hover:shadow-3xl transition-shadow overflow-hidden">
            <Link href="/login">
              <h1 className="text-3xl md:text-5xl font-bold text-[#FCBF15] mb-4 hover:text-[#FFD700] transition-colors flex items-center gap-2">
                <FaTv className="text-2xl md:text-4xl" /> Now Serving
              </h1>
            </Link>
            <h1 className="text-7xl md:text-9xl font-bold text-[#FCBF15] mb-4 md:mb-8">
              {latestServing?.displayNumber || "--"}
            </h1>
            <h1 className="text-xl md:text-3xl font-semibold text-gray-300 flex items-center gap-2 text-center">
              Proceed to <FaArrowRight className="text-[#FCBF15]" />{" "}
              <span className="text-[#FCBF15]">
                {latestServing?.officer?.name ? (
                  <>
                    {latestServing.officer.name}{" "}
                    <span className="text-xs md:text-sm">
                      ({latestServing.officer.prefix})
                    </span>
                  </>
                ) : (
                  "--"
                )}
              </span>
            </h1>
          </div>

          {/* QR Code Section */}
          <div className="h-1/4 min-h-[200px] flex gap-4 overflow-hidden">
            <div className="flex-1 bg-[#2c3e50] rounded-lg shadow-2xl p-4 hover:shadow-3xl transition-shadow overflow-auto">
              <Link href="/queue" className="block h-full">
                <div className="flex flex-col items-center justify-center h-full">
                  <FaQrcode className="text-6xl text-[#FCBF15] mb-4" />
                  <h2 className="text-lg md:text-xl font-bold text-[#FCBF15] mb-2 flex items-center gap-2">
                    Scan QR Code
                  </h2>
                  <p className="text-sm text-gray-300 text-center">
                    Get your queue number and select your concern
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex-1 bg-[#2c3e50] rounded-lg shadow-2xl p-4 hover:shadow-3xl transition-shadow overflow-auto">
              <h2 className="text-lg md:text-xl font-bold text-[#FCBF15] mb-2 flex items-center gap-2">
                <FaFileAlt /> Latest Memorandum
              </h2>
              <div className="text-gray-300">
                <p className="text-xs md:text-sm mb-1">
                  • OSA Memo No. 2024-001
                </p>
                <p className="text-xs md:text-sm mb-1">
                  • Guidelines for Student Activities
                </p>
                <p className="text-xs md:text-sm">• Updated Health Protocols</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-[#2c3e50] rounded-lg shadow-2xl p-4 md:p-8 hover:shadow-3xl transition-shadow overflow-hidden">
          <div className="flex justify-between items-center border-b-2 border-[#FCBF15] pb-4 mb-6">
            <h1 className="text-xl md:text-3xl font-semibold text-[#FCBF15] flex items-center gap-2">
              <FaTable /> Table
            </h1>
            <h1 className="text-xl md:text-3xl font-semibold text-[#FCBF15] flex items-center gap-2">
              <FaUser /> Officer
            </h1>
            <h1 className="text-xl md:text-3xl font-semibold text-[#FCBF15] flex items-center gap-2">
              <FaListAlt /> Queue
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeQueues.length > 0 ? (
              activeQueues.map((queue, index) => (
                <div
                  key={queue.officer.id}
                  className="flex justify-between items-center py-2 md:py-4 border-b border-gray-600"
                >
                  <span className="text-lg md:text-2xl font-medium text-gray-300 flex items-center gap-2">
                    Table {index + 1}
                  </span>
                  <span className="text-lg md:text-2xl font-medium text-gray-300 flex items-center gap-2">
                    {queue.officer.name}{" "}
                    <span className="text-xs md:text-sm text-gray-500">
                      ({queue.officer.prefix})
                    </span>
                  </span>
                  <span className="text-lg md:text-2xl font-medium text-[#FCBF15] flex items-center gap-2">
                    {queue.displayNumber}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                No active queues
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
