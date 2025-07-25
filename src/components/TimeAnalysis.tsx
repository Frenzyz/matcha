import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useThemeStore } from '../store/themeStore';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import LoadingSpinner from './LoadingSpinner';

interface TimeData {
  name: string;
  value: number;
  color: string;
}

interface Event {
  type: 'academic' | 'career' | 'wellness';
  start_time: string;
  end_time: string;
}

const HOURS_IN_WEEK = 168; // 24 * 7
const RECOMMENDED_SLEEP = 56; // 8 * 7 (weekly hours)
const SLEEP_START = 23; // 11 PM
const SLEEP_END = 7; // 7 AM

export default function TimeAnalysis() {
  const { isDarkMode } = useThemeStore();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchCalendarData();
    }
  }, [user]);

  const fetchCalendarData = async () => {
    try {
      // Get start and end of current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
      endOfWeek.setHours(23, 59, 59, 999);

      const { data: events } = await supabase
        .from('calendar_events')
        .select('type, start_time, end_time')
        .eq('user_id', user?.id)
        .gte('start_time', startOfWeek.toISOString())
        .lte('end_time', endOfWeek.toISOString())
        .order('start_time', { ascending: true });

      const timeDistribution = calculateTimeDistribution(events || []);
      const weekly = calculateWeeklyDistribution(events || [], startOfWeek);
      
      setTimeData(timeDistribution);
      setWeeklyData(weekly);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEventHours = (start: Date, end: Date, type: string): number => {
    // Calculate actual duration in hours
    const durationMs = end.getTime() - start.getTime();
    const hours = durationMs / (1000 * 60 * 60);
    
    // Handle invalid time ranges
    if (hours <= 0) {
      console.warn('Invalid event duration detected:', { start, end, type });
      return 0;
    }
    
    // For academic events, use actual duration but with a minimum of 30 minutes
    if (type === 'academic') {
      return Math.max(0.5, hours);
    }
    
    // For other event types, use actual duration with minimum 15 minutes
    return Math.max(0.25, hours);
  };

  const calculateTimeDistribution = (events: Event[]): TimeData[] => {
    const distribution: Record<string, number> = {
      sleep: RECOMMENDED_SLEEP,
      academic: 0,
      career: 0,
      wellness: 0,
      free: HOURS_IN_WEEK - RECOMMENDED_SLEEP
    };

    let totalEventHours = 0;
    
    events.forEach(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const eventHours = calculateEventHours(start, end, event.type);
      
      if (event.type in distribution && eventHours > 0) {
        distribution[event.type] += eventHours;
        totalEventHours += eventHours;
      }
    });

    // Calculate free time based on total event hours, ensuring it's not negative
    distribution.free = Math.max(0, HOURS_IN_WEEK - RECOMMENDED_SLEEP - totalEventHours);

    // Round all values to 1 decimal place for better precision
    Object.keys(distribution).forEach(key => {
      distribution[key] = Math.round(distribution[key] * 10) / 10;
    });

    return [
      { name: 'Sleep', value: distribution.sleep, color: '#4B5563' },
      { name: 'Academic', value: distribution.academic, color: '#10B981' },
      { name: 'Career', value: distribution.career, color: '#3B82F6' },
      { name: 'Wellness', value: distribution.wellness, color: '#8B5CF6' },
      { name: 'Free Time', value: distribution.free, color: '#EC4899' }
    ];
  };

  const calculateWeeklyDistribution = (events: Event[], startOfWeek: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return days.map((day, index) => {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(startOfWeek.getDate() + index);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start_time);
        return eventStart >= dayStart && eventStart <= dayEnd;
      });

      const dayDistribution = {
        name: day,
        sleep: Math.round(RECOMMENDED_SLEEP / 7), // Daily sleep hours
        academic: 0,
        career: 0,
        wellness: 0
      };

      dayEvents.forEach(event => {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        const hours = calculateEventHours(start, end, event.type);
        
        if (event.type in dayDistribution) {
          dayDistribution[event.type as keyof typeof dayDistribution] += hours;
        }
      });

      return dayDistribution;
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`p-6 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <h2 className="text-2xl font-bold mb-6">Weekly Time Analysis</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Time Distribution</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {timeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} hours`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Daily Breakdown</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value} hours`} />
                <Legend />
                <Bar dataKey="sleep" fill="#4B5563" stackId="a" />
                <Bar dataKey="academic" fill="#10B981" stackId="a" />
                <Bar dataKey="career" fill="#3B82F6" stackId="a" />
                <Bar dataKey="wellness" fill="#8B5CF6" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {timeData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}: {item.value} hours</span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold mb-2">Weekly Analysis</h4>
        <p className="text-sm">
          Based on recommended {RECOMMENDED_SLEEP} hours of sleep per week ({SLEEP_START}:00 - {SLEEP_END}:00 daily).
          Academic events are counted as 1 hour each, while other events use their actual duration.
        </p>
      </div>
    </div>
  );
}
