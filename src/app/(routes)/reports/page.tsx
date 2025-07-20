"use client";

import { useState, useEffect } from "react";
import { FiBarChart2, FiUsers, FiClock, FiTrendingUp } from "react-icons/fi";
import { supabase } from "@/lib/supabase";
import Header from "@/app/_components/Header";

interface DailyStats {
  total_count: number;
  waiting_count: number;
  served_count: number;
  no_show_count: number;
  transferred_count: number;
  prioritized_count: number;
  date: string;
  avg_queue_time: number;
  longest_queue_time: number;
  shortest_queue_time: number;
}

export default function ReportsPage() {
  const [statsData, setStatsData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('queue_stats')
          .select('*')
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching stats:', error);
          return;
        }

        setStatsData(data || []);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange, selectedDate]);

  function formatQueueTime(milliseconds: number): string {
    if (milliseconds === 0) return '0m';
    
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Queue Analytics</h1>
            <div className="flex gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'daily' | 'monthly' | 'yearly')}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Total Queue</span>
                <FiBarChart2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-blue-900">
                {statsData.reduce((sum, stat) => sum + stat.total_count, 0)}
              </span>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Served</span>
                <FiUsers className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-green-900">
                {statsData.reduce((sum, stat) => sum + stat.served_count, 0)}
              </span>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-yellow-700">Waiting</span>
                <FiClock className="w-4 h-4 text-yellow-600" />
              </div>
              <span className="text-2xl font-bold text-yellow-900">
                {statsData.reduce((sum, stat) => sum + stat.waiting_count, 0)}
              </span>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">No Show</span>
                <FiTrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-purple-900">
                {statsData.reduce((sum, stat) => sum + stat.no_show_count, 0)}
              </span>
            </div>
          </div>

          {/* Queue Time Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-700">Average Queue Time</span>
                <FiClock className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-2xl font-bold text-indigo-900">
                {formatQueueTime(statsData.reduce((sum, stat) => sum + stat.avg_queue_time, 0) / statsData.length)}
              </span>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-700">Longest Queue Time</span>
                <FiClock className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-2xl font-bold text-orange-900">
                {formatQueueTime(Math.max(...statsData.map(stat => stat.longest_queue_time)))}
              </span>
            </div>
            <div className="bg-teal-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-teal-700">Shortest Queue Time</span>
                <FiClock className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-2xl font-bold text-teal-900">
                {formatQueueTime(Math.min(...statsData.map(stat => stat.shortest_queue_time)))}
              </span>
            </div>
          </div>

          {/* Detailed Stats Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="pb-3 font-semibold text-gray-600">Date</th>
                  <th className="pb-3 font-semibold text-gray-600">Total</th>
                  <th className="pb-3 font-semibold text-gray-600">Served</th>
                  <th className="pb-3 font-semibold text-gray-600">Waiting</th>
                  <th className="pb-3 font-semibold text-gray-600">No Show</th>
                  <th className="pb-3 font-semibold text-gray-600">Transferred</th>
                  <th className="pb-3 font-semibold text-gray-600">Avg Time</th>
                  <th className="pb-3 font-semibold text-gray-600">Longest</th>
                  <th className="pb-3 font-semibold text-gray-600">Shortest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statsData.map((stat) => (
                  <tr key={stat.date} className="hover:bg-gray-50">
                    <td className="py-4 text-gray-900">{formatDate(stat.date)}</td>
                    <td className="py-4 text-gray-900">{stat.total_count}</td>
                    <td className="py-4 text-green-600">{stat.served_count}</td>
                    <td className="py-4 text-yellow-600">{stat.waiting_count}</td>
                    <td className="py-4 text-red-600">{stat.no_show_count}</td>
                    <td className="py-4 text-purple-600">{stat.transferred_count}</td>
                    <td className="py-4 text-indigo-600">{formatQueueTime(stat.avg_queue_time)}</td>
                    <td className="py-4 text-orange-600">{formatQueueTime(stat.longest_queue_time)}</td>
                    <td className="py-4 text-teal-600">{formatQueueTime(stat.shortest_queue_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
} 