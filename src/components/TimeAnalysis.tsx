import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useThemeStore } from '../store/themeStore';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { Event, EventType } from '../types';
import { eventBus, CALENDAR_EVENTS } from '../services/eventBus';
import { format, addDays, parseISO, startOfWeek, endOfWeek, differenceInHours } from 'date-fns';
import LoadingSpinner from './LoadingSpinner';

interface TimeData {
  name: string;
  value: number;
  color: string;
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
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [rangeStartDate, setRangeStartDate] = useState<Date>(startOfWeek(new Date()));
  const [rangeEndDate, setRangeEndDate] = useState<Date>(endOfWeek(new Date()));

  // Fetch calendar data with date range
  const fetchCalendarData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get date range
      const start = rangeStartDate;
      const end = rangeEndDate;
      
      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('type, start_time, end_time')
        .eq('user_id', user.id)
        .gte('start_time', start.toISOString())
        .lte('end_time', end.toISOString())
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      const timeDistribution = calculateTimeDistribution(events || []);
      const weekly = calculateWeeklyDistribution(events || [], start);
      
      setTimeData(timeDistribution);
      setWeeklyData(weekly);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, rangeStartDate, rangeEndDate]);

  // Set time range
  const handleTimeRangeChange = (range: 'week' | 'month') => {
    setTimeRange(range);
    
    const today = new Date();
    
    if (range === 'week') {
      setRangeStartDate(startOfWeek(today));
      setRangeEndDate(endOfWeek(today));
    } else {
      // Month range
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setRangeStartDate(monthStart);
      setRangeEndDate(monthEnd);
    }
  };

  // Calculate hours for an event
  const calculateEventHours = (start: Date, end: Date, type: EventType): number => {
    // Calculate actual duration but minimum 0.5 hour
    const hours = Math.max(0.5, differenceInHours(end, start, { roundingMethod: 'ceil' }));
    return hours;
  };

  // Calculate time distribution
  const calculateTimeDistribution = (events: Event[]): TimeData[] => {
    const distribution: Record<string, number> = {
      sleep: RECOMMENDED_SLEEP,
      academic: 0,
      career: 0,
      wellness: 0,
      social: 0,
      free: HOURS_IN_WEEK - RECOMMENDED_SLEEP
    };

    events.forEach(event => {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      const eventHours = calculateEventHours(start, end, event.type);
      
      if (event.type in distribution) {
        distribution[event.type] += eventHours;
        distribution.free -= eventHours;
      }
    });

    // Ensure no negative values and round all values
    Object.keys(distribution).forEach(key => {
      distribution[key] = Math.max(0, Math.round(distribution[key]));
    });

    return [
      { name: 'Sleep', value: distribution.sleep, color: '#4B5563' },
      { name: 'Academic', value: distribution.academic, color: '#10B981' },
      { name: 'Career', value: distribution.career, color: '#3B82F6' },
      { name: 'Wellness', value: distribution.wellness, color: '#8B5CF6' },
      { name: 'Social', value: distribution.social, color: '#EC4899' },
      { name: 'Free Time', value: distribution.free, color: '#F59E0B' }
    ];
  };

  // Calculate weekly distribution
  const calculateWeeklyDistribution = (events: Event[], startDate: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return days.map((day, index) => {
      const dayStart = new Date(startDate);
      dayStart.setDate(startDate.getDate() + index);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter(event => {
        const eventStart = parseISO(event.start_time);
        return eventStart >= dayStart && eventStart <= dayEnd;
      });

      const dayDistribution = {
        name: day,
        sleep: Math.round(RECOMMENDED_SLEEP / 7), // Daily sleep hours
        academic: 0,
        career: 0,
        wellness: 0,
        social: 0
      };

      dayEvents.forEach(event => {
        const start = parseISO(event.start_time);
        const end = parseISO(event.end_time);
        const hours = calculateEventHours(start, end, event.type);
        
        if (event.type in dayDistribution) {
          dayDistribution[event.type as keyof typeof dayDistribution] += hours;
        }
      });

      return dayDistribution;
    });
  };

  // Listen for calendar updates
  useEffect(() => {
    const handleCalendarUpdate = () => {
      fetchCalendarData();
    };
    
    const unsubscribeUpdated = eventBus.on(CALENDAR_EVENTS.UPDATED, handleCalendarUpdate);
    const unsubscribeAdded = eventBus.on(CALENDAR_EVENTS.ADDED, handleCalendarUpdate);
    const unsubscribeDeleted = eventBus.on(CALENDAR_EVENTS.DELETED, handleCalendarUpdate);
    const unsubscribeModified = eventBus.on(CALENDAR_EVENTS.MODIFIED, handleCalendarUpdate);
    
    return () => {
      unsubscribeUpdated();
      unsubscribeAdded();
      unsubscribeDeleted();
      unsubscribeModified();
    };
  }, [fetchCalendarData]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchCalendarData();
    }
  }, [user, fetchCalendarData]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`p-6 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Time Analysis</h2>
        
        <div className="flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              timeRange === 'week'
                ? `bg-emerald-600 text-white`
                : `bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`
            }`}
            onClick={() => handleTimeRangeChange('week')}
          >
            This Week
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${
              timeRange === 'month'
                ? `bg-emerald-600 text-white`
                : `bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`
            }`}
            onClick={() => handleTimeRangeChange('month')}
          >
            This Month
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {format(rangeStartDate, 'MMM d, yyyy')} - {format(rangeEndDate, 'MMM d, yyyy')}
        </h3>
      </div>
      
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
                <Tooltip 
                  formatter={(value: number) => `${Math.round(value)} hours`} 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#374151' : '#fff',
                    borderColor: isDarkMode ? '#4B5563' : '#E5E7EB', 
                    color: isDarkMode ? '#E5E7EB' : '#111827'
                  }}
                />
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
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4B5563' : '#E5E7EB'} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: isDarkMode ? '#E5E7EB' : '#6B7280' }}
                />
                <YAxis 
                  tick={{ fill: isDarkMode ? '#E5E7EB' : '#6B7280' }}
                />
                <Tooltip 
                  formatter={(value: number) => `${Math.round(value)} hours`} 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#374151' : '#fff',
                    borderColor: isDarkMode ? '#4B5563' : '#E5E7EB', 
                    color: isDarkMode ? '#E5E7EB' : '#111827'
                  }}
                />
                <Legend />
                <Bar dataKey="sleep" fill="#4B5563" stackId="a" />
                <Bar dataKey="academic" fill="#10B981" stackId="a" />
                <Bar dataKey="career" fill="#3B82F6" stackId="a" />
                <Bar dataKey="wellness" fill="#8B5CF6" stackId="a" />
                <Bar dataKey="social" fill="#EC4899" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {timeData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}: {Math.round(item.value)} hours</span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold mb-2">Weekly Analysis</h4>
        <p className="text-sm">
          Based on recommended {RECOMMENDED_SLEEP} hours of sleep per week ({SLEEP_START}:00 - {SLEEP_END}:00 daily).
          Events are measured by their actual duration with a minimum of 30 minutes per event.
        </p>
      </div>
    </div>
  );
}
