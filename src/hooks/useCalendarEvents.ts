import { useState, useEffect, useCallback } from 'react';
import { Event } from '../types';
import { eventManager } from '../services/eventManager';
import { eventBus, CALENDAR_EVENTS } from '../services/eventBus';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

export function useCalendarEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await eventManager.fetchEvents(user.id);
      setEvents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(message);
      logger.error('Error in useCalendarEvents.fetchEvents:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  useEffect(() => {
    // Subscribe to event manager updates
    const unsubscribe = eventManager.subscribe(fetchEvents);

    // Subscribe to event bus events
    const unsubscribeUpdated = eventBus.on(CALENDAR_EVENTS.UPDATED, fetchEvents);
    const unsubscribeAdded = eventBus.on(CALENDAR_EVENTS.ADDED, fetchEvents);
    const unsubscribeDeleted = eventBus.on(CALENDAR_EVENTS.DELETED, fetchEvents);
    const unsubscribeModified = eventBus.on(CALENDAR_EVENTS.MODIFIED, fetchEvents);

    return () => {
      unsubscribe();
      unsubscribeUpdated();
      unsubscribeAdded();
      unsubscribeDeleted();
      unsubscribeModified();
    };
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    fetchEvents
  };
}