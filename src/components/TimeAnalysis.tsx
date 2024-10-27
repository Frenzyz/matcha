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

const HOURS_IN_DAY = 24;
const RECOMMENDED_SLEEP = 8;
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
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('type, start_time, end_time')
        .eq('user_id', user?.id)
        .gte('start_time', startOfWeek.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      const timeDistribution = calculateTimeDistribution(events || []);
      const weekly = calculateWeeklyDistribution(events || []);
      
      setTimeData(timeDistribution);
      setWeeklyData(weekly);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeDistribution = (events: Event[]): TimeData[] => {
    const distribution: Record<string, number> = {
      sleep: RECOMMENDED_SLEEP * 7, // Weekly sleep hours
      academic: 0,
      career: 0,
      wellness: 0,
      free: (HOURS_IN_DAY - RECOMMENDED_SLEEP) * 7 // Remaining hours after sleep
    };

    events.forEach(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      let eventHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      // Check if event overlaps with sleep time
      const startHour = start.getHours();
      const endHour = end.getHours();

      if ((startHour >= SLEEP_START || startHour < SLEEP_END) || 
          (endHour >= SLEEP_START || endHour < SLEEP_END)) {
        // Calculate sleep overlap
        const sleepOverlap = calculateSleepOverlap(start, end);
        distribution.sleep -= sleepOverlap;
        eventHours -= sleepOverlap;
      }

      if (event.type in distribution) {
        distribution[event.type] += eventHours;
        distribution.free -= eventHours;
      }
    });

    // Ensure no negative values
    Object.keys(distribution).forEach(key => {
      distribution[key] = Math.max(0, distribution[key]);
    });

    return [
      { name: 'Sleep', value: distribution.sleep, color: '#4B5563' },
      { name: 'Academic', value: distribution.academic, color: '#10B981' },
      { name: 'Career', value: distribution.career, color: '#3B82F6' },
      { name: 'Wellness', value: distribution.wellness, color: '#8B5CF6' },
      { name: 'Free Time', value: distribution.free, color: '#EC4899' }
    ];
  };

  const calculateSleepOverlap = (start: Date, end: Date): number => {
    const sleepStart = new Date(start);
    sleepStart.setHours(SLEEP_START, 0, 0, 0);
    const sleepEnd = new Date(start);
    sleepEnd.setHours(SLEEP_END, 0, 0, 0);
    
    if (sleepEnd < sleepStart) {
      sleepEnd.setDate(sleepEnd.getDate() + 1);
    }

    const overlapStart = Math.max(start.getTime(), sleepStart.getTime());
    const overlapEnd = Math.min(end.getTime(), sleepEnd.getTime());
    
    return Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60));
  };

  const calculateWeeklyDistribution = (events: Event[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => {
      const dayEvents = events.filter(event => {
        const eventDay = new Date(event.start_time).getDay();
        return days[eventDay] === day;
      });

      return {
        name: day,
        sleep: RECOMMENDED_SLEEP,
        academic: dayEvents.filter(e => e.type === 'academic').length,
        career: dayEvents.filter(e => e.type === 'career').length,
        wellness: dayEvents.filter(e => e.type === 'wellness').length
      };
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`p-6 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <h2 className="text-2xl font-bold mb-6">Time Analysis</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Weekly Distribution</h3>
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
                <Tooltip formatter={(value: number) => `${Math.round(value * 10) / 10} hours`} />
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
                <Tooltip />
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
            <span>{item.name}: {Math.round(item.value * 10) / 10} hours</span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold mb-2">Sleep Schedule Analysis</h4>
        <p className="text-sm">
          Based on recommended {RECOMMENDED_SLEEP} hours of sleep per day ({SLEEP_START}:00 - {SLEEP_END}:00).
          Adjust your schedule if actual sleep differs significantly.
        </p>
      </div>
    </div>
  );
}