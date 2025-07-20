import {
  FiPlus,
  FiRefreshCw,
  FiPause,
  FiPlay,
  FiUserX,
  FiUserCheck,
  FiUserMinus,
  FiSkipForward,
  FiArrowRight,
  FiX,
  FiBarChart2
} from "react-icons/fi";
import { supabase } from "@/lib/supabase";
import { Officer, QueueItem } from "@/types";
import { useState, useEffect } from "react";

interface QueueStats {
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

interface TimerState {
  waitingTime: number;
  consultationTime: number;
  isWaiting: boolean;
  isConsulting: boolean;
  lastUpdate: number;
}

interface OfficerQueueCardProps {
  officer: Officer;
  officerQueue: QueueItem[];
  stats: QueueStats;
  dailyStats?: DailyStats;
  loading: boolean;
  countdowns: Record<string, number>;
  countdownRefs: React.MutableRefObject<Record<string, NodeJS.Timeout>>;
  setCountdowns: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  mutateQueue: () => void;
  mutateDailyStats: () => void;
  setShowTransferPopup: (show: boolean) => void;
  setSelectedQueueItem: (item: QueueItem | null) => void;
  addToQueue: (officer: Officer) => void;
  removeFromQueue: (queueId: string, officerName: string, queueNumber: string) => void;
  resetQueue: (officerId: string, officerName: string) => void;
  handleStatusChange: (queueId: string, newStatus: string, officerName: string, queueNumber: string) => void;
  handleNextServing: (officer: Officer, officerQueue: QueueItem[]) => void;
  handlePrioritize: (queue: QueueItem, officer: Officer) => void;
  playCallSound: (queueNumber: string) => void;
}

export default function OfficerQueueCard({
  officer,
  officerQueue,
  stats,
  dailyStats,
  loading,
  countdowns,
  countdownRefs,
  setCountdowns,
  mutateQueue,
  mutateDailyStats,
  setShowTransferPopup,
  setSelectedQueueItem,
  addToQueue,
  removeFromQueue,
  resetQueue,
  handleStatusChange,
  handleNextServing,
  handlePrioritize,
  playCallSound,
}: OfficerQueueCardProps) {
  const [isOnline, setIsOnline] = useState(officer.online);
  const [timers, setTimers] = useState<Record<string, TimerState>>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const savedTimers = localStorage.getItem(`timers_${officer.id}`);
      if (savedTimers) {
        return JSON.parse(savedTimers);
      }
    }
    return {};
  });

  // Save timers to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`timers_${officer.id}`, JSON.stringify(timers));
    }
  }, [timers, officer.id]);

  // Initialize timers when queue changes
  useEffect(() => {
    const newTimers: Record<string, TimerState> = {};
    const now = Date.now();
    
    officerQueue.forEach((queue) => {
      if (queue.status === 'waiting') {
        const existingTimer = timers[queue.id];
        let initialWaitingTime = 0;
        
        if (queue.waiting_start_time) {
          const calculatedTime = Math.floor((now - new Date(queue.waiting_start_time).getTime()) / 1000);
          // Prevent negative times due to server/client time differences
          initialWaitingTime = Math.max(0, calculatedTime);
        } else {
          initialWaitingTime = existingTimer?.waitingTime || 0;
        }
        
        newTimers[queue.id] = {
          waitingTime: initialWaitingTime,
          consultationTime: existingTimer?.consultationTime || 0,
          isWaiting: true,
          isConsulting: false,
          lastUpdate: now
        };
      } else if (queue.status === 'served') {
        const existingTimer = timers[queue.id];
        const initialWaitingTime = queue.total_waiting_time || existingTimer?.waitingTime || 0;
        let initialConsultationTime = 0;
        
        if (queue.consultation_start_time) {
          const calculatedTime = Math.floor((now - new Date(queue.consultation_start_time).getTime()) / 1000);
          // Prevent negative times due to server/client time differences
          initialConsultationTime = Math.max(0, calculatedTime);
        } else {
          initialConsultationTime = existingTimer?.consultationTime || 0;
        }
        
        newTimers[queue.id] = {
          waitingTime: initialWaitingTime,
          consultationTime: initialConsultationTime,
          isWaiting: false,
          isConsulting: true,
          lastUpdate: now
        };
      }
    });

    setTimers(newTimers);
  }, [officerQueue]);

  // Update timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTimers((prevTimers) => {
        const newTimers = { ...prevTimers };
        
        Object.entries(newTimers).forEach(([id, timer]) => {
          const elapsedSeconds = Math.floor((now - timer.lastUpdate) / 1000);
          if (elapsedSeconds > 0) {
            if (timer.isWaiting) {
              newTimers[id] = {
                ...timer,
                waitingTime: timer.waitingTime + elapsedSeconds,
                lastUpdate: now
              };
            } else if (timer.isConsulting) {
              newTimers[id] = {
                ...timer,
                consultationTime: timer.consultationTime + elapsedSeconds,
                lastUpdate: now
              };
            }
          }
        });

        return newTimers;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update timer state when status changes
  const handleStatusChangeWithTimer = async (queueId: string, newStatus: string, officerName: string, queueNumber: string) => {
    if (newStatus === 'served') {
      const now = Date.now();
      setTimers((prevTimers) => {
        const timer = prevTimers[queueId];
        if (timer) {
          return {
            ...prevTimers,
            [queueId]: {
              ...timer,
              isWaiting: false,
              isConsulting: true,
              lastUpdate: now
            }
          };
        }
        return prevTimers;
      });
    }
    
    // Call the original handleStatusChange
    await handleStatusChange(queueId, newStatus, officerName, queueNumber);
    
    // Force refresh daily stats after a short delay
    setTimeout(() => {
      mutateDailyStats();
      console.log("Daily stats refreshed for officer:", officer.name);
    }, 300);
  };

  useEffect(() => {
    setIsOnline(officer.online);
  }, [officer.online]);

  // Find waiting items
  const waitingItems = officerQueue.filter((q) => q.status === "waiting");

  // Check if there are any prioritized items
  const prioritizedItems = waitingItems.filter((q) =>
    Boolean(q.is_prioritized)
  );
  const hasPrioritizedItems = prioritizedItems.length > 0;

  // Optimistic toggle for real-time UI
  const handleToggleStatus = async () => {
    const prevOnline = isOnline;
    setIsOnline(!isOnline); // Optimistically update
    try {
      const { error } = await supabase
        .from("officers")
        .update({ online: !prevOnline })
        .eq("id", officer.id);
      if (error) throw error;
    } catch {
      setIsOnline(prevOnline); // Revert if error
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div
      key={officer.id}
      className={`bg-white rounded-lg shadow-sm transition-all duration-300 w-[350px] flex flex-col h-[500px] ${
        !isOnline ? "opacity-50" : ""
      }`}
    >
      {/* Officer Header */}
      <div className="p-2 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm px-2 py-1 bg-red-100 text-red-700 rounded-md font-semibold">
                {stats.total}
              </span>
              <div>
                <h3
                  className={`text-sm font-semibold ${
                    !isOnline ? "text-gray-500" : "text-gray-900"
                  }`}
                >
                  Table {officer.prefix}
                </h3>
                <p
                  className={`text-xs ${
                    !isOnline ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {officer.name}
                </p>
              </div>
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => resetQueue(officer.id, officer.name)}
              className="p-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
              disabled={loading}
              title="Reset Queue Counter"
            >
              <FiRefreshCw className="w-3 h-3 text-gray-600" />
            </button>
            <button
              onClick={() => addToQueue(officer)}
              className="p-1 bg-[#FCBF15] rounded hover:bg-[#e5ac13] disabled:opacity-50 transition-colors"
              disabled={loading}
              title="Add to Queue"
            >
              <FiPlus className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      </div>


      {/* Current Queue Number */}
      <div
        className={`p-1 border-b ${
          officerQueue.length > 0 && officerQueue[0].is_prioritized
            ? "bg-yellow-300 border-yellow-700 shadow-inner"
            : "bg-blue-50 border-blue-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium ${
              officerQueue.length > 0 && officerQueue[0].is_prioritized
                ? "text-yellow-900 font-bold"
                : "text-gray-600"
            }`}
          >
            {officerQueue.length > 0 && officerQueue[0].is_prioritized
              ? "⭐ PRIORITY SERVING ⭐"
              : "Currently Serving"}
          </span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <span
                className={`text-lg font-bold ${
                  !isOnline
                    ? "text-gray-600"
                    : officerQueue.length > 0 && officerQueue[0].is_prioritized
                    ? "text-yellow-800"
                    : "text-blue-700"
                }`}
              >
                {officerQueue.length > 0
                  ? countdowns[officerQueue[0].id] > 0
                    ? `${officer.prefix}${officerQueue[0].number}`
                    : officerQueue[0].status === "waiting"
                    ? `${officer.prefix}${officerQueue[0].number}`
                    : officerQueue.length > 1
                    ? `${officer.prefix}${officerQueue[1].number}`
                    : "---"
                  : "---"}
              </span>
              {officerQueue.length > 0 && officerQueue[0].status === "waiting" && (
                <span className="text-xs text-gray-500 ml-2">
                  {formatTime(timers[officerQueue[0].id]?.waitingTime || 0)}
                </span>
              )}
              {officerQueue.length > 0 && officerQueue[0].status === "served" && (
                <span className="text-xs text-gray-500 ml-2">
                  {formatTime(timers[officerQueue[0].id]?.consultationTime || 0)}
                </span>
              )}
              {officerQueue.length > 0 &&
                officerQueue[0].status === "waiting" &&
                !countdowns[officerQueue[0].id] && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() =>
                        handleStatusChangeWithTimer(
                          officerQueue[0].id,
                          "served",
                          officer.name,
                          `${officer.prefix}${officerQueue[0].number}`
                        )
                      }
                      className="p-0.5 bg-green-100 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
                      disabled={loading}
                      title="Mark as Served"
                    >
                      <FiUserCheck className="w-3 h-3 text-green-600" />
                    </button>
                    <button
                      onClick={() =>
                        handleStatusChangeWithTimer(
                          officerQueue[0].id,
                          "no_show",
                          officer.name,
                          `${officer.prefix}${officerQueue[0].number}`
                        )
                      }
                      className="p-0.5 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                      disabled={loading}
                      title="Mark as No Show"
                    >
                      <FiUserX className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                )}
            </div>
            {officerQueue.length > 0 &&
              officerQueue[0].status === "waiting" &&
              !countdowns[officerQueue[0].id] && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedQueueItem(officerQueue[0]);
                      setShowTransferPopup(true);
                    }}
                    className="p-0.5 bg-blue-100 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
                    disabled={loading}
                    title="Transfer"
                  >
                    <FiArrowRight className="w-3 h-3 text-blue-600" />
                  </button>
                  <button
                    onClick={() =>
                      removeFromQueue(
                        officerQueue[0].id,
                        officer.name,
                        `${officer.prefix}${officerQueue[0].number}`
                      )
                    }
                    className="p-0.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    disabled={loading || countdowns[officerQueue[0].id] > 0}
                    title="Cancel"
                  >
                    <FiUserMinus className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 p-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-1 auto-rows-[36px]">
          {officerQueue.slice(1).map((queue) => (
            <div
              key={queue.id}
              className={`group relative flex items-center justify-center rounded transition-colors ${
                queue.status === "served"
                  ? "bg-green-50 border border-green-200"
                  : queue.status === "no_show"
                  ? "bg-red-50 border border-red-200"
                  : queue.is_prioritized
                  ? "bg-yellow-300 border-2 border-yellow-700 shadow-md animate-pulse"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <div className="flex items-center justify-center space-x-1">
                <span
                  className={`text-sm font-medium ${
                    queue.status === "served"
                      ? "text-green-700"
                      : queue.status === "no_show"
                      ? "text-red-700"
                      : queue.is_prioritized
                      ? "text-yellow-900 font-extrabold"
                      : "text-gray-700"
                  }`}
                >
                  {queue.is_prioritized ? "⭐ " : ""}
                  {`${officer.prefix}${queue.number}`}
                </span>
                {queue.status === "waiting" && (
                  <span className="text-xs text-gray-500">
                    ({formatTime(timers[queue.id]?.waitingTime || 0)})
                  </span>
                )}
                {queue.status === "served" && (
                  <span className="text-xs text-gray-500">
                    ({formatTime(timers[queue.id]?.consultationTime || 0)})
                  </span>
                )}
                {countdowns[queue.id] > 0 && (
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500">
                      ({countdowns[queue.id]}s)
                    </span>
                    <button
                      onClick={() => {
                        clearInterval(countdownRefs.current[queue.id]);
                        delete countdownRefs.current[queue.id];
                        setCountdowns((prev) => ({
                          ...prev,
                          [queue.id]: 0,
                        }));

                        supabase
                          .from("queue")
                          .update({
                            status: "waiting",
                            is_prioritized: false,
                          })
                          .eq("id", queue.id)
                          .then(() => {
                            mutateQueue();
                            // Refresh daily stats after status change
                            setTimeout(() => mutateDailyStats(), 200);
                          });
                      }}
                      className="ml-1 p-0.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      disabled={loading}
                      title="Undo"
                    >
                      <FiRefreshCw className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                )}
              </div>
              {queue.status === "waiting" && !countdowns[queue.id] && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-10 rounded transition-opacity">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handlePrioritize(queue, officer)}
                      className={`p-0.5 rounded hover:bg-yellow-200 disabled:opacity-50 transition-colors ${
                        queue.is_prioritized
                          ? "bg-yellow-100"
                          : "bg-yellow-50"
                      }`}
                      disabled={loading || queue.is_prioritized}
                      title={
                        queue.is_prioritized
                          ? "Already prioritized"
                          : "Prioritize"
                      }
                    >
                      <FiArrowRight
                        className={`w-3 h-3 ${
                          queue.is_prioritized
                            ? "text-yellow-800"
                            : "text-yellow-700"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() =>
                        removeFromQueue(
                          queue.id,
                          officer.name,
                          `${officer.prefix}${queue.number}`
                        )
                      }
                      className="p-0.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      disabled={loading}
                      title="Remove"
                    >
                      <FiX className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-2 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => {
              if (officerQueue.length > 0) {
                const currentQueue = officerQueue[0];
                playCallSound(`${officer.prefix}${currentQueue.number}`);
              }
            }}
            className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
            disabled={loading || officerQueue.length === 0}
          >
            <FiPlay className="w-3 h-3" />
            <span>Call Again</span>
          </button>

          {officerQueue.length > 0 && countdowns[officerQueue[0].id] > 0 ? (
            <button
              onClick={() => {
                clearInterval(countdownRefs.current[officerQueue[0].id]);
                delete countdownRefs.current[officerQueue[0].id];
                setCountdowns((prev) => ({
                  ...prev,
                  [officerQueue[0].id]: 0,
                }));

                supabase
                  .from("queue")
                  .update({
                    status: "waiting",
                    is_prioritized: false,
                  })
                  .eq("id", officerQueue[0].id)
                  .then(() => {
                    mutateQueue();
                  });
              }}
              className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
              disabled={loading}
            >
              <FiRefreshCw className="w-3 h-3" />
              <span>Undo Action ({countdowns[officerQueue[0].id]}s)</span>
            </button>
          ) : hasPrioritizedItems ? (
            <button
              onClick={() => handleNextServing(officer, officerQueue)}
              className="bg-yellow-500 hover:bg-yellow-600 shadow-md border-2 border-yellow-700 font-bold text-white px-2 py-1 rounded-lg text-xs disabled:opacity-50 transition-colors flex items-center justify-center space-x-1 animate-pulse"
              disabled={loading || officerQueue.length <= 1}
            >
              <FiSkipForward className="w-4 h-4" />
              <span className="font-bold uppercase">⭐ SERVE PRIORITY ⭐</span>
            </button>
          ) : (
            <button
              onClick={() => handleNextServing(officer, officerQueue)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
              disabled={loading || officerQueue.length <= 1}
            >
              <FiSkipForward className="w-3 h-3" />
              <span>Next Serving</span>
            </button>
          )}
          <button
            onClick={handleToggleStatus}
            className={`relative z-10 ${
              !isOnline
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-gray-500 hover:bg-gray-600"
            } text-white px-2 py-1 rounded text-xs disabled:opacity-50 transition-colors flex items-center justify-center space-x-1 ${
              !isOnline ? "!opacity-100 !shadow-lg !font-bold" : ""
            }`}
            disabled={loading}
          >
            {!isOnline ? (
              <>
                <FiPlay className="w-3 h-3" />
                <span>Set to Active</span>
              </>
            ) : (
              <>
                <FiPause className="w-3 h-3" />
                <span>Standby</span>
              </>
            )}
          </button>
          <button
            onClick={() => resetQueue(officer.id, officer.name)}
            className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
            disabled={loading}
          >
            <FiRefreshCw className="w-3 h-3" />
            <span>Reset Counter</span>
          </button>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="p-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center space-x-1 mb-1">
          <FiBarChart2 className="w-3 h-3 text-gray-600" />
          <span className="text-xs font-medium text-gray-600">Today&apos;s Stats</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Total:</span>
            <span className="font-medium">{dailyStats?.total_count || stats.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Served:</span>
            <span className="font-medium text-green-600">{dailyStats?.served_count || stats.served}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">No Show:</span>
            <span className="font-medium text-red-600">{dailyStats?.no_show_count || stats.no_show}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Waiting:</span>
            <span className="font-medium text-blue-600">{dailyStats?.waiting_count || stats.waiting}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Prioritized:</span>
            <span className="font-medium text-yellow-600">{dailyStats?.prioritized_count || waitingItems.filter(q => q.is_prioritized).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Transferred:</span>
            <span className="font-medium text-purple-600">{dailyStats?.transferred_count || stats.transferred}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
