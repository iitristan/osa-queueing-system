import { useState } from "react";
import {
  FiUser,
  FiClock,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiArrowRight,
  FiPlay,
  FiPause,
  FiUserCheck,
  FiUserX,
} from "react-icons/fi";
import { Officer, QueueItem, QueueStats } from "@/types";
import Header from "@/app/components/Header";

interface OfficerProfileProps {
  officer: Officer;
  officerQueue: QueueItem[];
  stats: QueueStats;
  loading: boolean;
  setShowTransferPopup: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedQueueItem: React.Dispatch<React.SetStateAction<QueueItem | null>>;
  prioritizingQueueId: string | null;
  addToQueue: (officer: Officer) => Promise<void>;
  removeFromQueue: (
    queueItemId: string,
    officerName: string,
    queueNumber: string
  ) => Promise<void>;
  resetQueue: (officerId: string, officerName: string) => Promise<void>;
  handleStatusChange: (
    queueId: string,
    newStatus: string,
    officerName: string,
    queueNumber: string
  ) => Promise<void>;
  handleNextServing: (
    officer: Officer,
    officerQueue: QueueItem[]
  ) => Promise<void>;
  handlePrioritize: (queue: QueueItem, officer: Officer) => Promise<void>;
  toggleStandby: (officerId: string) => Promise<void>;
  playCallSound: (queueNumber: string) => void;
}

export default function OfficerProfile({
  officer,
  officerQueue,
  stats,
  loading,
  setShowTransferPopup,
  setSelectedQueueItem,
  prioritizingQueueId,
  addToQueue,
  removeFromQueue,
  resetQueue,
  handleStatusChange,
  handleNextServing,
  handlePrioritize,
  toggleStandby,
  playCallSound,
}: OfficerProfileProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const currentServing = officerQueue.find((item) => item.status === "serving");
  const waitingQueue = officerQueue.filter((item) => item.status === "waiting");

  return (
        <div className="container mx-auto px-4">
          {/* Officer Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-100 p-3 rounded-full">
                    <FiUser className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{officer.name}</h2>
                    <p className="text-gray-600 text-sm">
                      Counter {officer.prefix} • {officer.role}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {officer.counter_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm ${
                      autoRefresh
                        ? "bg-gray-100 text-gray-700"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {autoRefresh ? (
                      <>
                        <FiPause className="w-4 h-4" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <FiPlay className="w-4 h-4" />
                        <span>Resume</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => toggleStandby(officer.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      officer.online
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {officer.online ? "Active" : "Standby"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Current Serving */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium">Currently Serving</h3>
                    <div className="flex space-x-2">
                      {currentServing && (
                        <>
                          <button
                            onClick={() =>
                              playCallSound(
                                `${officer.prefix}${currentServing.number}`
                              )
                            }
                            className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-700"
                            title="Call Again"
                          >
                            <FiPlay className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(
                                currentServing.id,
                                "served",
                                officer.name,
                                `${officer.prefix}${currentServing.number}`
                              )
                            }
                            className="p-2 bg-green-100 rounded-md hover:bg-green-200 text-green-700"
                            title="Mark as Served"
                          >
                            <FiUserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(
                                currentServing.id,
                                "no_show",
                                officer.name,
                                `${officer.prefix}${currentServing.number}`
                              )
                            }
                            className="p-2 bg-red-100 rounded-md hover:bg-red-200 text-red-700"
                            title="Mark as No Show"
                          >
                            <FiUserX className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleNextServing(officer, officerQueue)}
                        disabled={loading || officerQueue.length <= 1}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  {currentServing ? (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl font-bold text-blue-700">
                            {officer.prefix}
                            {currentServing.number}
                          </span>
                          {currentServing.is_prioritized && (
                            <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-100">
                              Priority
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4 text-sm">
                      No current serving
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Queue Statistics */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-5">
                  <h3 className="text-md font-medium mb-4">Queue Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                      <div className="flex items-center space-x-2">
                        <FiClock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Total</span>
                      </div>
                      <span className="text-lg font-semibold block mt-1">
                        {stats.total}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                      <div className="flex items-center space-x-2">
                        <FiCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600">Served</span>
                      </div>
                      <span className="text-lg font-semibold block mt-1">
                        {stats.served}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                      <div className="flex items-center space-x-2">
                        <FiX className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-gray-600">No Show</span>
                      </div>
                      <span className="text-lg font-semibold block mt-1">
                        {stats.no_show}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                      <div className="flex items-center space-x-2">
                        <FiClock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">Waiting</span>
                      </div>
                      <span className="text-lg font-semibold block mt-1">
                        {stats.waiting}
                      </span>
                    </div>
                  </div>
                  {stats.last_served && (
                    <div className="mt-4 text-xs text-gray-500">
                      Last served:{" "}
                      {new Date(stats.last_served).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Queue List */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium">Queue List</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => addToQueue(officer)}
                        disabled={loading || !officer.online}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => resetQueue(officer.id, officer.name)}
                        disabled={loading || officerQueue.length === 0}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {waitingQueue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">
                            {officer.prefix}
                            {item.number}
                          </span>
                          {item.is_prioritized && (
                            <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-100">
                              Priority
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handlePrioritize(item, officer)}
                            disabled={prioritizingQueueId === item.id}
                            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
                            title="Prioritize"
                          >
                            <FiArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedQueueItem(item);
                              setShowTransferPopup(true);
                            }}
                            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
                            title="Transfer"
                          >
                            <FiRefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              removeFromQueue(
                                item.id,
                                officer.name,
                                `${officer.prefix}${item.number}`
                              )
                            }
                            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
                            title="Remove"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {waitingQueue.length === 0 && (
                      <div className="text-gray-500 text-center py-4 text-sm">
                        Queue is empty
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
