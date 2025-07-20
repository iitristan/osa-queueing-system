"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import Header from "@/app/_components/Header";
import { Officer, QueueItem, QueueStats } from "@/types";
import { FiClock, FiCheck, FiX, FiRefreshCw, FiUser, FiPlus, FiPower, FiWatch } from "react-icons/fi";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatTime = (seconds: number): string => {
  if (!seconds) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatElapsedTime = (startTime: string): string => {
  const start = new Date(startTime).getTime();
  const now = new Date().getTime();
  const elapsedSeconds = Math.floor((now - start) / 1000);
  return formatTime(elapsedSeconds);
};

export default function OfficerProfilePage() {
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countdownRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch officer data
  const { data: officer } = useSWR<Officer>(
    `/api/officers/${params.id}`,
    fetcher
  );

  // Fetch queue data with auto-refresh
  const { data: queueData, mutate: mutateQueue } = useSWR<{
    queueItems: QueueItem[];
    queueCounters: Record<string, number>;
  }>("/api/queue", fetcher, {
    refreshInterval: 5000,
  });

  const addToQueue = async (officer: Officer) => {
    setLoading(true);
    setError(null);

    try {
      // Get the current counter value
      const { data: counterData } = await supabase
        .from("queue_counters")
        .select("counter")
        .eq("officer_id", officer.id)
        .single();

      const counter = counterData?.counter || 1;

      // Create new queue item
      const { error } = await supabase.from("queue").insert({
        officer_id: officer.id,
        number: counter,
        status: "waiting",
        is_prioritized: false,
      });

      if (error) throw error;

      // Update counter
      const { error: updateError } = await supabase
        .from("queue_counters")
        .upsert({
          officer_id: officer.id,
          counter: counter + 1,
        });

      if (updateError) throw updateError;

      mutateQueue();
    } catch (err) {
      console.error("Error adding to queue:", err);
      setError(err instanceof Error ? err.message : "Failed to add to queue");
    } finally {
      setLoading(false);
    }
  };

  const removeFromQueue = async (queueId: string) => {
    try {
      setLoading(true);
      
      // Remove queue item directly

      const { error } = await supabase.from("queue").delete().eq("id", queueId);

      if (error) throw error;

      mutateQueue();
    } catch (err) {
      console.error("Error removing from queue:", err);
      setError("Failed to remove from queue");
    } finally {
      setLoading(false);
    }
  };

  const resetQueue = async (officerId: string) => {
    if (!confirm("Are you sure you want to reset this queue?")) return;

    setLoading(true);
    setError(null);

    try {
      // Delete all queue items for this officer
      const { error: deleteError } = await supabase
        .from("queue")
        .delete()
        .eq("officer_id", officerId);

      if (deleteError) throw deleteError;

      const { error: counterError } = await supabase
        .from("queue_counters")
        .upsert({
          officer_id: officerId,
          counter: 1,
          last_reset: new Date().toISOString(),
        });

      if (counterError) throw counterError;

      mutateQueue();
    } catch (err) {
      console.error("Error resetting queue:", err);
      setError(err instanceof Error ? err.message : "Failed to reset queue");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (queueId: string, newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("queue")
        .update({ status: newStatus })
        .eq("id", queueId);

      if (error) throw error;

      // Only start countdown for waiting items
      if (newStatus === "waiting") {
        countdownRefs.current[queueId] = setInterval(() => {
          removeFromQueue(queueId);
        }, 1000);
      }

      mutateQueue();
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const toggleStandby = async (officerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("officers")
        .update({ online: !officer?.online })
        .eq("id", officerId);
      if (error) throw error;
      mutateQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle standby");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      // Clean up all intervals
      Object.values(countdownRefs.current).forEach((interval) =>
        clearInterval(interval)
      );
    };
  }, []);

  if (!officer || !queueData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const officerQueue = (queueData.queueItems || [])
    .filter((item) => item.officer_id === officer.id)
    .sort((a, b) => {
      // First, sort by status to keep "waiting" items first
      if (a.status !== "waiting" && b.status === "waiting") return 1;
      if (a.status === "waiting" && b.status !== "waiting") return -1;

      // Then, among waiting items, sort by priority
      if (a.status === "waiting" && b.status === "waiting") {
        if (a.is_prioritized && !b.is_prioritized) return -1;
        if (!a.is_prioritized && b.is_prioritized) return 1;
      }

      // Finally, sort by created_at
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  // Calculate queue statistics
  const stats: QueueStats = {
    total: officerQueue.length,
    served: officerQueue.filter((item) => item.status === "served").length,
    no_show: officerQueue.filter((item) => item.status === "no_show").length,
    waiting: officerQueue.filter((item) => item.status === "waiting").length,
    last_served:
      officerQueue
        .filter((item) => item.status === "served")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]?.created_at || null,
  };

  // Find the currently serving queue item
  const currentQueue = officerQueue[0] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-800 rounded-lg flex items-center">
              <FiX className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Officer Info Card */}
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <FiUser className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{officer.name}</h1>
                  <p className="text-gray-500">Counter {officer.prefix}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => addToQueue(officer)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Add to Queue
                </button>
                <button
                  onClick={() => resetQueue(officer.id)}
                  className="flex items-center px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  <FiRefreshCw className="w-4 h-4 mr-2" />
                  Reset Queue
                </button>
                <button
                  onClick={() => toggleStandby(officer.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-white transition-colors ${
                    officer.online 
                      ? 'bg-yellow-500 hover:bg-yellow-600' 
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50`}
                  disabled={loading}
                >
                  <FiPower className="w-4 h-4 mr-2" />
                  {officer.online ? 'Standby' : 'Set to Active'}
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Total</span>
                  <FiClock className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-blue-900">{stats.total}</span>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-700">Waiting</span>
                  <FiClock className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="text-2xl font-bold text-yellow-900">{stats.waiting}</span>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Served</span>
                  <FiCheck className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-green-900">{stats.served}</span>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700">No Show</span>
                  <FiX className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-2xl font-bold text-red-900">{stats.no_show}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Last Served</span>
                  <FiClock className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {stats.last_served ? new Date(stats.last_served).toLocaleString() : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Currently Serving */}
            <div className="bg-white rounded-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Currently Serving</h2>
              {currentQueue ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <span className="text-sm text-gray-500 block mb-1">Queue Number</span>
                      <span className="text-2xl font-bold text-blue-700">{officer.prefix}{currentQueue.number}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <span className="text-sm text-gray-500 block mb-1">Full Name</span>
                      <span className="text-lg font-semibold text-gray-700">
                        {currentQueue.full_name || 'Not provided'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <span className="text-sm text-gray-500 block mb-1">College/Faculty</span>
                      <span className="text-lg text-gray-700">
                        {currentQueue.college || 'Not provided'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <span className="text-sm text-gray-500 block mb-1">Priority</span>
                      <span className="text-lg font-semibold text-yellow-700">
                        {currentQueue.is_prioritized ? '⭐ Prioritized' : 'Normal'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <span className="text-sm text-gray-500 block mb-1">Waiting Time</span>
                      <div className="flex items-center text-lg text-gray-700">
                        <FiClock className="w-4 h-4 mr-2" />
                        {currentQueue.status === 'waiting' && currentQueue.waiting_start_time
                          ? formatElapsedTime(currentQueue.waiting_start_time)
                          : currentQueue.total_waiting_time
                            ? formatTime(currentQueue.total_waiting_time)
                            : '0m'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <span className="text-sm text-gray-500 block mb-1">Consultation Time</span>
                      <div className="flex items-center text-lg text-gray-700">
                        <FiWatch className="w-4 h-4 mr-2" />
                        {currentQueue.status === 'served' && currentQueue.consultation_start_time
                          ? formatElapsedTime(currentQueue.consultation_start_time)
                          : currentQueue.total_consultation_time
                            ? formatTime(currentQueue.total_consultation_time)
                            : 'Not started'}
                      </div>
                    </div>
                  </div>
                  {currentQueue.status === 'waiting' && (
                    <div className="flex flex-wrap gap-3 justify-end">
                      <button
                        onClick={() => handleStatusChange(currentQueue.id, 'served')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Mark Served
                      </button>
                      <button
                        onClick={() => handleStatusChange(currentQueue.id, 'no_show')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Mark No Show
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Transfer
                      </button>
                      <button
                        onClick={() => removeFromQueue(currentQueue.id)}
                        className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
                  <FiClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No one is currently being served</p>
                </div>
              )}
            </div>

            {/* Right Column - Next in Queue and Queue List */}
            <div className="space-y-6">
              {/* Next in Queue Card */}
              <div className="bg-white rounded-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Next in Queue</h2>
                {officerQueue.length > 1 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <span className="text-sm text-gray-500 block mb-1">Queue Number</span>
                        <span className="text-xl font-bold text-blue-700">{officer.prefix}{officerQueue[1].number}</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <span className="text-sm text-gray-500 block mb-1">Full Name</span>
                        <span className="text-base font-semibold text-gray-700">
                          {officerQueue[1].full_name || 'Not provided'}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <span className="text-sm text-gray-500 block mb-1">Waiting Time</span>
                        <div className="flex items-center text-base text-gray-700">
                          <FiClock className="w-4 h-4 mr-2" />
                          {officerQueue[1].waiting_start_time
                            ? formatElapsedTime(officerQueue[1].waiting_start_time)
                            : '0m'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <span className="text-sm text-gray-500 block mb-1">Estimated Wait</span>
                        <div className="flex items-center text-base text-gray-700">
                          <FiClock className="w-4 h-4 mr-2" />
                          {currentQueue?.total_consultation_time
                            ? formatTime(currentQueue.total_consultation_time)
                            : 'Calculating...'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => handleStatusChange(officerQueue[1].id, 'no_show')}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Mark No Show
                      </button>
                      <button
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Transfer
                      </button>
                      <button
                        onClick={() => removeFromQueue(officerQueue[1].id)}
                        className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
                    <FiClock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No one is waiting in queue</p>
                  </div>
                )}
              </div>

              {/* Queue List Card */}
              <div className="bg-white rounded-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Queue List</h2>
                {officerQueue.length > 2 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-gray-100">
                          <th className="pb-2 font-semibold text-gray-600">Number</th>
                          <th className="pb-2 font-semibold text-gray-600">Name</th>
                          <th className="pb-2 font-semibold text-gray-600">Waiting</th>
                          <th className="pb-2 font-semibold text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {officerQueue.slice(2).map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="py-2 font-semibold text-gray-900">{officer.prefix}{item.number}</td>
                            <td className="py-2 text-gray-700">{item.full_name || 'Not provided'}</td>
                            <td className="py-2 text-gray-700">
                              {item.waiting_start_time
                                ? formatElapsedTime(item.waiting_start_time)
                                : '0m'}
                            </td>
                            <td className="py-2">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleStatusChange(item.id, 'no_show')}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                  disabled={loading}
                                >
                                  No Show
                                </button>
                                <button
                                  onClick={() => removeFromQueue(item.id)}
                                  className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs hover:bg-gray-100 transition-colors"
                                  disabled={loading}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-gray-500">No additional queue numbers</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
