"use client";

import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import {
  FiClock,
  FiCheck,
  FiXCircle,
  FiRefreshCw,
  FiBarChart2,
  FiPlus,
  FiWatch,
} from "react-icons/fi";
import { supabase } from "@/lib/supabase";
import OfficerQueueCard from "./OfficerQueueCard";
import LoadingScreen from "@/app/_components/LoadingScreen";
import Header from "@/app/_components/Header";
import { QueueItem } from "@/types";

const COLLEGES = [
  "Faculty of Arts and Letters",
  "Faculty of Civil Law",
  "Faculty of Medicine and Surgery",
  "Faculty of Pharmacy",
  "College of Architecture",
  "College of Commerce and Business Administration",
  "College of Education",
  "College of Fine Arts and Design",
  "College of Nursing",
  "College of Rehabilitation Sciences",
  "College of Science",
  "Conservatory of Music",
  "Graduate School",
  "Institute of Information and Computing Sciences",
  "Institute of Physical Education and Athletics",
  "UST Junior High School",
  "UST Senior High School",
];

interface Officer {
  id: string;
  name: string;
  online: boolean;
  prefix: string;
  role: string;
  counter_type: string;
}

// Using global QueueItem interface from src/types/index.ts

interface LastUpdate {
  action:
    | "added"
    | "removed"
    | "reset"
    | "served"
    | "no_show"
    | "transferred"
    | "prioritized";
  queueNumber: string;
  officerName: string;
  timestamp: string;
}

// Local interface for admin queue stats (includes transferred count)
interface AdminQueueStats {
  total: number;
  waiting: number;
  served: number;
  no_show: number;
  transferred: number;
  last_served: string | null;
}

interface DailyStats {
  officer_id: string;
  total_count: number;
  waiting_count: number;
  served_count: number;
  no_show_count: number;
  transferred_count: number;
  cancelled_count: number;
  prioritized_count: number;
  avg_waiting_time: number;
  avg_consultation_time: number;
  date: string;
}

interface AddQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  officers: Officer[];
  onSubmit: (data: {
    officer_id: string;
    full_name?: string;
    college?: string;
  }) => Promise<void>;
  loading: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const AddQueueModal = ({ isOpen, onClose, officers, onSubmit, loading }: AddQueueModalProps) => {
  const [formData, setFormData] = useState({
    officer_id: "",
    full_name: "",
    college: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    setFormData({
      officer_id: "",
      full_name: "",
      college: "",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Add Queue Number</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Officer *
            </label>
            <select
              name="officer_id"
              value={formData.officer_id}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select an officer</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} (Counter {o.prefix})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name (Optional)
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              College/Faculty (Optional)
            </label>
            <select
              name="college"
              value={formData.college}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select college/faculty</option>
              {COLLEGES.map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.officer_id || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Queue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  if (!seconds) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// formatElapsedTime removed - functionality moved to individual components

// QueueItemTimer component removed - functionality moved to individual components

export default function AdminClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<LastUpdate | null>(null);
  const [showTransferPopup, setShowTransferPopup] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(
    null
  );
  const [selectedTargetOfficer, setSelectedTargetOfficer] =
    useState<Officer | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const countdownRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showAddQueueModal, setShowAddQueueModal] = useState(false);

  // Fetch officers with their queue counters
  const { data: officers } = useSWR<Officer[]>("/api/officers", fetcher);

  // Fetch queue data with auto-refresh
  const { data: queueData, mutate: mutateQueue } = useSWR<{
    queueItems: QueueItem[];
    queueCounters: Record<string, number>;
  }>("/api/queue", fetcher, {
    refreshInterval: 5000,
    onError: (err) => {
      console.error("Error fetching queue data:", err);
      setError("Failed to fetch queue data. Retrying...");
    }
  });

  // Fetch daily stats for all officers with more frequent updates
  const { data: dailyStatsResponse, mutate: mutateDailyStats } = useSWR<
    DailyStats[] | { error: string }
  >("/api/stats/daily", fetcher, {
    refreshInterval: 5000,
    onError: (err) => {
      console.error("Error fetching daily stats:", err);
      setError("Failed to fetch daily stats. Retrying...");
    }
  });

    // Convert array to record format for easier access
  const dailyStats = React.useMemo(() => {
    console.log("Processing daily stats response:", dailyStatsResponse);
    
    // Handle error responses
    if (!dailyStatsResponse || 'error' in dailyStatsResponse) {
      console.warn("Daily stats API returned error or no data:", dailyStatsResponse);
      return {};
    }
    
    // Handle null/undefined or non-array responses
    if (!Array.isArray(dailyStatsResponse)) {
      console.warn("Daily stats response is not an array:", dailyStatsResponse);
      return {};
    }
    
    console.log("Daily stats array length:", dailyStatsResponse.length);
    
    // If we have an empty array, it means no daily stats exist yet
    if (dailyStatsResponse.length === 0) {
      console.warn("No daily stats found - table might be empty. Using fallback calculation.");
      
      // Create fallback stats from current queue data if available
      if (queueData?.queueItems && officers) {
        const fallbackStats: Record<string, DailyStats> = {};
        const today = new Date().toISOString().split('T')[0];
        
        officers.forEach(officer => {
          const todayItems = queueData.queueItems.filter(item => 
            item.officer_id === officer.id && 
            item.created_at.startsWith(today)
          );
          
          fallbackStats[officer.id] = {
            officer_id: officer.id,
            total_count: todayItems.length,
            waiting_count: todayItems.filter(item => item.status === 'waiting').length,
            served_count: todayItems.filter(item => item.status === 'served').length,
            no_show_count: todayItems.filter(item => item.status === 'no_show').length,
            transferred_count: todayItems.filter(item => item.status === 'transferred').length,
            cancelled_count: 0, // Cancelled is tracked separately in DB
            prioritized_count: todayItems.filter(item => item.is_prioritized).length,
            avg_waiting_time: 0,
            avg_consultation_time: 0,
            date: today
          };
        });
        
        console.log("Created fallback stats:", fallbackStats);
        return fallbackStats;
      }
      
      return {};
    }
    
    // Convert array to record format
    const stats = dailyStatsResponse.reduce((acc, stat) => {
      acc[stat.officer_id] = stat;
      return acc;
    }, {} as Record<string, DailyStats>);
    
    console.log("Processed daily stats:", stats);
    return stats;
  }, [dailyStatsResponse, queueData, officers]);

  const playCallSound = (queueNumber: string) => {
    try {
      const speech = new SpeechSynthesisUtterance(
        `Now serving number ${queueNumber}`
      );
      window.speechSynthesis.speak(speech);
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

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

      setLastUpdate({
        officerName: officer.name,
        queueNumber: `${officer.prefix}${counter}`,
        action: "added",
        timestamp: new Date().toISOString(),
      });

      // Update both queue and daily stats
      await Promise.all([mutateQueue(), mutateDailyStats()]);
    } catch (err) {
      console.error("Error adding to queue:", err);
      setError(err instanceof Error ? err.message : "Failed to add to queue");
    } finally {
      setLoading(false);
    }
  };

  const removeFromQueue = async (
    queueItemId: string,
    officerName: string,
    queueNumber: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Clear any existing countdown for this item
      if (countdownRefs.current[queueItemId]) {
        clearInterval(countdownRefs.current[queueItemId]);
        delete countdownRefs.current[queueItemId];
        setCountdowns((prev) => ({ ...prev, [queueItemId]: 0 }));
      }

      // Instead of deleting, mark as cancelled
      const { error } = await supabase
        .from("queue")
        .update({
          status: "cancelled",
          is_prioritized: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueItemId);

      if (error) throw error;

      setLastUpdate({
        officerName,
        queueNumber,
        action: "removed",
        timestamp: new Date().toISOString(),
      });

      // Update both queue and daily stats
      await Promise.all([mutateQueue(), mutateDailyStats()]);
    } catch (err) {
      console.error("Error removing from queue:", err);
      setError(
        err instanceof Error ? err.message : "Failed to remove from queue"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetQueue = async (officerId: string, officerName: string) => {
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

      setLastUpdate({
        officerName,
        queueNumber: "all",
        action: "reset",
        timestamp: new Date().toISOString(),
      });

      // Update both queue and daily stats
      await Promise.all([mutateQueue(), mutateDailyStats()]);
    } catch (err) {
      console.error("Error resetting queue:", err);
      setError(err instanceof Error ? err.message : "Failed to reset queue");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    queueId: string,
    newStatus: string,
    officerName: string,
    queueNumber: string
  ) => {
    try {
      // Clear any existing countdown for this item
      if (countdownRefs.current[queueId]) {
        clearInterval(countdownRefs.current[queueId]);
        delete countdownRefs.current[queueId];
        setCountdowns((prev) => ({ ...prev, [queueId]: 0 }));
      }

      // Update status in database
      const { error } = await supabase
        .from("queue")
        .update({
          status: newStatus,
          is_prioritized: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueId);

      if (error) throw error;

      // Update last update notification
      setLastUpdate({
        officerName,
        queueNumber,
        action: newStatus === "served" ? "served" : "no_show",
        timestamp: new Date().toISOString(),
      });

      // First update the queue data
      await mutateQueue();

      // Wait a moment for the database triggers to fire
      await new Promise(resolve => setTimeout(resolve, 200));

      // Then refresh daily stats
      await mutateDailyStats();

      console.log("Status changed and stats refreshed for:", queueNumber);

      // Start new countdown
      setCountdowns((prev) => ({ ...prev, [queueId]: 3 }));
      countdownRefs.current[queueId] = setInterval(() => {
        setCountdowns((prev) => {
          const current = prev[queueId];
          if (current <= 1) {
            clearInterval(countdownRefs.current[queueId]);
            delete countdownRefs.current[queueId];
            // Force refresh both queue and daily stats after countdown
            mutateQueue().then(() => {
              setTimeout(() => mutateDailyStats(), 200);
            });
            return { ...prev, [queueId]: 0 };
          }
          return { ...prev, [queueId]: current - 1 };
        });
      }, 1000);
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleNextServing = async (
    officer: Officer,
    officerQueue: QueueItem[]
  ) => {
    if (officerQueue.length <= 1) return;

    // Find the next prioritized item if exists
    let nextIndex = 1;
    for (let i = 1; i < officerQueue.length; i++) {
      if (officerQueue[i].is_prioritized) {
        nextIndex = i;
        break;
      }
    }

    const currentQueue = officerQueue[0];
    const nextQueue = officerQueue[nextIndex];

    // Update current queue to served
    await supabase
      .from("queue")
      .update({
        status: "served",
        is_prioritized: false,
        updated_at: new Date().toISOString(), // Add timestamp for tracking
      })
      .eq("id", currentQueue.id);

    // Update last update notification
    setLastUpdate({
      officerName: officer.name,
      queueNumber: `${officer.prefix}${currentQueue.number}`,
      action: "served",
      timestamp: new Date().toISOString(),
    });

    // Force refresh the queue data to update stats immediately
    await mutateQueue();

    // Start countdown for current queue
    setCountdowns((prev) => ({ ...prev, [currentQueue.id]: 3 }));
    countdownRefs.current[currentQueue.id] = setInterval(() => {
      setCountdowns((prev) => {
        const current = prev[currentQueue.id];
        if (current <= 1) {
          clearInterval(countdownRefs.current[currentQueue.id]);
          delete countdownRefs.current[currentQueue.id];
          // Force refresh the queue data to update stats
          mutateQueue();
          return { ...prev, [currentQueue.id]: 0 };
        }
        return { ...prev, [currentQueue.id]: current - 1 };
      });
    }, 1000);

    // Play sound for next queue
    playCallSound(`${officer.prefix}${nextQueue.number}`);
  };

  // Processing function for ensuring queue items have correct priority values
  const processQueue = (items: QueueItem[] | null | undefined): QueueItem[] => {
    if (!items || items.length === 0) return [];

    return items
      .map((item) => ({
        ...item,
        // Ensure is_prioritized is strictly a boolean
        is_prioritized: Boolean(item.is_prioritized),
      }))
      .filter((item) => item.status === "waiting") // Only show waiting items in the queue
      .sort((a, b) => {
        // First sort by status (waiting items first)
        if (a.status !== "waiting" && b.status === "waiting") return 1;
        if (a.status === "waiting" && b.status !== "waiting") return -1;

        // Then prioritized items come first
        if (a.status === "waiting" && b.status === "waiting") {
          if (a.is_prioritized && !b.is_prioritized) return -1;
          if (!a.is_prioritized && b.is_prioritized) return 1;

          // If both are prioritized, maintain order by created_at
          if (a.is_prioritized && b.is_prioritized) {
            return (
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
            );
          }
        }

        // Finally sort by created_at
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
  };

  // Updated function to handle prioritization
  const handlePrioritize = async (queue: QueueItem, officer: Officer) => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        "Prioritizing queue item:",
        queue.id,
        "Queue number:",
        queue.number
      );

      // Super direct approach
      // 1. First use raw SQL to set the priority
      try {
        const { error } = await supabase.rpc("execute_sql", {
          sql_query: `UPDATE queue SET is_prioritized = TRUE, priority_timestamp = NOW() WHERE id = '${queue.id}'`,
        });

        if (error) console.log("Raw SQL error:", error);
      } catch {
        console.log("Raw SQL method unavailable, using standard update");
      }

      // 2. Standard update as backup
      await supabase
        .from("queue")
        .update({
          is_prioritized: true,
          priority_timestamp: new Date().toISOString(),
          status: "waiting",
        })
        .eq("id", queue.id);

      // 3. Aggressively move the queue item to position 2 (right after currently serving)
      const { data: waitingItems } = await supabase
        .from("queue")
        .select("*")
        .eq("officer_id", officer.id)
        .eq("status", "waiting")
        .order("created_at", { ascending: true });

      if (waitingItems && waitingItems.length > 0) {
        // If the item isn't already in position 1 or 2
        const currentlyServingItem = waitingItems[0];
        if (
          currentlyServingItem.id !== queue.id &&
          (waitingItems.length <= 1 || waitingItems[1].id !== queue.id)
        ) {
          // Calculate a timestamp that places it right after the currently serving item
          let newTimestamp;
          if (waitingItems.length === 1) {
            // If only one item, place after it
            const servingTime = new Date(waitingItems[0].created_at).getTime();
            newTimestamp = new Date(servingTime + 1);
          } else {
            // Place between item 1 and 3 (or item 1 and now)
            const servingTime = new Date(waitingItems[0].created_at).getTime();
            // Calculate time for positioning
            newTimestamp = new Date(servingTime + 1);
          }

          // Update the timestamp
          await supabase
            .from("queue")
            .update({
              created_at: newTimestamp.toISOString(),
            })
            .eq("id", queue.id);
        }
      }

      // 4. Update notification
      setLastUpdate({
        action: "prioritized",
        queueNumber: `${officer.prefix}${queue.number}`,
        officerName: officer.name,
        timestamp: new Date().toISOString(),
      });

      // 5. Play sound
      playCallSound(`${officer.prefix}${queue.number}`);

      // 6. Verify and refresh both queue and daily stats
      await Promise.all([mutateQueue(), mutateDailyStats()]);
    } catch (err) {
      console.error("Error prioritizing queue:", err);
      setError(
        err instanceof Error ? err.message : "Failed to prioritize queue"
      );
    } finally {
      setLoading(false);
    }
  };

  // toggleStandby moved to OfficerQueueCard component

  const handleTransfer = async () => {
    if (!selectedQueueItem || !selectedTargetOfficer) return;

    setLoading(true);
    setError(null);

    try {
      // First mark the item as transferred to track it in the original officer's stats
      const { error: transferError } = await supabase
        .from("queue")
        .update({ status: 'transferred' })
        .eq("id", selectedQueueItem.id);

      if (transferError) throw transferError;

      // Wait a moment for the trigger to update the original officer's stats
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then change the officer_id and reset status to waiting for the new officer
      const { error: updateError } = await supabase
        .from("queue")
        .update({ 
          officer_id: selectedTargetOfficer.id,
          status: 'waiting',
          is_prioritized: false
        })
        .eq("id", selectedQueueItem.id);

      if (updateError) throw updateError;

      setLastUpdate({
        officerName: selectedTargetOfficer.name,
        queueNumber: `${selectedTargetOfficer.prefix}${selectedQueueItem.number}`,
        action: "transferred",
        timestamp: new Date().toISOString(),
      });

      setShowTransferPopup(false);
      setSelectedQueueItem(null);
      setSelectedTargetOfficer(null);

      // Update both queue and daily stats
      await Promise.all([mutateQueue(), mutateDailyStats()]);
    } catch (err) {
      console.error("Error transferring queue:", err);
      setError(err instanceof Error ? err.message : "Failed to transfer queue");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQueue = async (data: {
    officer_id: string;
    full_name?: string;
    college?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const officer = officers?.find((o) => o.id === data.officer_id);
      if (!officer) throw new Error("Officer not found");

      // Get the current counter value
      const { data: counterData } = await supabase
        .from("queue_counters")
        .select("counter")
        .eq("officer_id", data.officer_id)
        .single();

      const counter = counterData?.counter || 1;

      // Create new queue item
      const { error } = await supabase.from("queue").insert({
        officer_id: data.officer_id,
        number: counter,
        status: "waiting",
        is_prioritized: false,
        full_name: data.full_name || null,
        college: data.college || null,
      });

      if (error) throw error;

      // Update counter
      const { error: updateError } = await supabase
        .from("queue_counters")
        .upsert({
          officer_id: data.officer_id,
          counter: counter + 1,
        });

      if (updateError) throw updateError;

      setLastUpdate({
        officerName: officer.name,
        queueNumber: `${officer.prefix}${counter}`,
        action: "added",
        timestamp: new Date().toISOString(),
      });

      // Update both queue and daily stats
      await Promise.all([mutateQueue(), mutateDailyStats()]);
      setShowAddQueueModal(false);
    } catch (err) {
      console.error("Error adding queue:", err);
      setError(err instanceof Error ? err.message : "Failed to add queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to real-time updates
    const officerSubscription = supabase
      .channel("officers-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "officers" },
        () => {
          // Refetch officers data when changes occur
          if (officers) {
            Promise.all([mutateQueue(), mutateDailyStats()]);
          }
        }
      )
      .subscribe();

    return () => {
      officerSubscription.unsubscribe();
    };
  }, [officers, mutateQueue, mutateDailyStats]);

  useEffect(() => {
    return () => {
      // Clean up all intervals
      Object.values(countdownRefs.current).forEach((interval) =>
        clearInterval(interval)
      );
    };
  }, []);

  // Fix priority values on component load
  useEffect(() => {
    if (queueData?.queueItems) {
      // Find any queue items with non-boolean priority flags
      const itemsToFix = queueData.queueItems.filter(
        (item) => typeof item.is_prioritized !== "boolean"
      );

      if (itemsToFix.length > 0) {
        console.log("Found items with non-boolean priority flags:", itemsToFix);

        // Fix each item
        const fixItems = async () => {
          for (const item of itemsToFix) {
            const shouldBePrioritized = Boolean(item.is_prioritized);

            await supabase
              .from("queue")
              .update({
                is_prioritized: shouldBePrioritized,
                // Set priority timestamp if prioritized
                ...(!shouldBePrioritized
                  ? {}
                  : {
                      priority_timestamp: new Date().toISOString(),
                    }),
              })
              .eq("id", item.id);
          }

          // Refresh queue data after fixes
          mutateQueue();
        };

        fixItems();
      }
    }
  }, [queueData, mutateQueue]);

  useEffect(() => {
    const updateTimestamp = () => {
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString());
    };
    updateTimestamp();
    const interval = setInterval(updateTimestamp, 1000 * 30); // update every 30s
    return () => clearInterval(interval);
  }, []);

  if (!officers || !queueData) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="container mx-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Add Queue Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowAddQueueModal(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <FiPlus className="mr-2" />
            Add Queue Number
          </button>
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-4 bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-900">
              Today&apos;s Analytics
            </h2>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            <div className="flex flex-col items-center bg-yellow-50 rounded-lg py-3 px-1">
              <FiClock className="text-black w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-black mb-0.5">
                Pending
              </span>
              <span className="text-xl font-bold text-black">
                {queueData?.queueItems
                  ? queueData.queueItems.filter(item => item.status === "waiting").length
                  : 0}
              </span>
            </div>
            <div className="flex flex-col items-center bg-green-50 rounded-lg py-3 px-1">
              <FiCheck className="text-green-700 w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-green-700 mb-0.5">
                Served
              </span>
              <span className="text-xl font-bold text-green-800">
                {dailyStats
                  ? Object.values(dailyStats).reduce(
                      (sum, stat) => sum + (stat.served_count || 0),
                      0
                    )
                  : 0}
              </span>
            </div>
            <div className="flex flex-col items-center bg-red-50 rounded-lg py-3 px-1">
              <FiXCircle className="text-red-600 w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-red-700 mb-0.5">
                No Show
              </span>
              <span className="text-xl font-bold text-red-800">
                {dailyStats
                  ? Object.values(dailyStats).reduce(
                      (sum, stat) => sum + (stat.no_show_count || 0),
                      0
                    )
                  : 0}
              </span>
            </div>
            <div className="flex flex-col items-center bg-purple-50 rounded-lg py-3 px-1">
              <FiRefreshCw className="text-purple-700 w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-purple-700 mb-0.5">
                Transferred
              </span>
              <span className="text-xl font-bold text-purple-800">
                {dailyStats && Object.keys(dailyStats).length > 0
                  ? Object.values(dailyStats).reduce(
                      (sum, stat) => sum + (stat.transferred_count || 0),
                      0
                    )
                  : 0}
              </span>
            </div>
            <div className="flex flex-col items-center bg-blue-50 rounded-lg py-3 px-1">
              <FiBarChart2 className="text-blue-700 w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-blue-900 mb-0.5">
                Total Queue
              </span>
              <span className="text-xl font-bold text-blue-900">
                {dailyStats
                  ? Object.values(dailyStats).reduce(
                      (sum, stat) => sum + (stat.total_count || 0),
                      0
                    )
                  : 0}
              </span>
            </div>
            <div className="flex flex-col items-center bg-indigo-50 rounded-lg py-3 px-1">
              <FiClock className="text-indigo-700 w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-indigo-700 mb-0.5">
                Avg Wait Time
              </span>
              <span className="text-xl font-bold text-indigo-800">
                {dailyStats
                  ? formatTime(
                      Math.round(
                        Object.values(dailyStats).reduce(
                          (sum, stat) => sum + (stat.avg_waiting_time || 0),
                          0
                        ) / Object.keys(dailyStats).length
                      )
                    )
                  : "0m"}
              </span>
            </div>
            <div className="flex flex-col items-center bg-teal-50 rounded-lg py-3 px-1">
              <FiWatch className="text-teal-700 w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-teal-700 mb-0.5">
                Avg Consult Time
              </span>
              <span className="text-xl font-bold text-teal-800">
                {dailyStats
                  ? formatTime(
                      Math.round(
                        Object.values(dailyStats).reduce(
                          (sum, stat) => sum + (stat.avg_consultation_time || 0),
                          0
                        ) / Object.keys(dailyStats).length
                      )
                    )
                  : "0m"}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 italic">
              * Statistics reset daily at midnight
            </span>
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated}
            </span>
          </div>
        </div>

        {lastUpdate && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg flex items-center space-x-2 border border-blue-200">
            <FiClock className="w-4 h-4" />
            <span className="text-sm">
              {lastUpdate.action === "added" && "Added"}
              {lastUpdate.action === "removed" && "Removed"}
              {lastUpdate.action === "served" && "Served"}
              {lastUpdate.action === "reset" && "Reset"}
              {lastUpdate.action === "no_show" && "No Show"}
              {lastUpdate.action === "transferred" && "Transferred"}
              {lastUpdate.action === "prioritized" && "Prioritized"}
              {" queue "}
              {lastUpdate.queueNumber}
              {" for "}
              {lastUpdate.officerName}
              {" at "}
              {new Date(lastUpdate.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {(officers || [])
            .sort((a, b) => a.prefix.localeCompare(b.prefix))
            .map((officer) => {
              const rawOfficerQueue = queueData?.queueItems
                ? queueData.queueItems.filter(
                    (item) => item.officer_id === officer.id
                  )
                : [];

              // Process the queue with our enhanced processing function
              const officerQueue = processQueue(rawOfficerQueue);

              // Calculate queue statistics
              const stats: AdminQueueStats = {
                total: officerQueue.length,
                served: officerQueue.filter((item) => item.status === "served")
                  .length,
                no_show: officerQueue.filter(
                  (item) => item.status === "no_show"
                ).length,
                waiting: officerQueue.filter(
                  (item) => item.status === "waiting"
                ).length,
                transferred: dailyStats[officer.id]?.transferred_count || 0,
                last_served:
                  officerQueue
                    .filter((item) => item.status === "served")
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )[0]?.created_at || null,
              };

              return (
                <OfficerQueueCard
                  key={officer.id}
                  officer={officer}
                  officerQueue={officerQueue}
                  stats={stats}
                  dailyStats={dailyStats?.[officer.id]}
                  loading={loading}
                  countdowns={countdowns}
                  countdownRefs={countdownRefs}
                  setCountdowns={setCountdowns}
                  mutateQueue={mutateQueue}
                  mutateDailyStats={mutateDailyStats}
                  setShowTransferPopup={setShowTransferPopup}
                  setSelectedQueueItem={setSelectedQueueItem}
                  addToQueue={addToQueue}
                  removeFromQueue={removeFromQueue}
                  resetQueue={resetQueue}
                  handleStatusChange={handleStatusChange}
                  handleNextServing={handleNextServing}
                  handlePrioritize={handlePrioritize}
                  playCallSound={playCallSound}
                />
              );
            })}
        </div>

        {/* Add Queue Modal */}
        <AddQueueModal
          isOpen={showAddQueueModal}
          onClose={() => setShowAddQueueModal(false)}
          officers={officers || []}
          onSubmit={handleAddQueue}
          loading={loading}
        />
      </div>

      {/* Transfer Popup */}
      {showTransferPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Transfer Queue</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Target Officer
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedTargetOfficer?.id || ""}
                  onChange={(e) => {
                    const officer = officers?.find(
                      (o) => o.id === e.target.value
                    );
                    setSelectedTargetOfficer(officer || null);
                  }}
                >
                  <option value="">Select an officer</option>
                  {officers?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} (Counter {o.prefix})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowTransferPopup(false);
                    setSelectedQueueItem(null);
                    setSelectedTargetOfficer(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={!selectedTargetOfficer || loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
