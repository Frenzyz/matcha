import { useState, useEffect, useCallback } from 'react';
import { Event } from '../types/index';
import { eventManager } from '../services/eventManager';
import { eventBus, CALENDAR_EVENTS } from '../services/eventBus';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

export function useTodoEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const updateEvents = useCallback(() => {
    setEvents(eventManager.getEvents());
  }, []);

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
      logger.error('Error in useTodoEvents.fetchEvents:', err);
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
    const unsubscribe = eventManager.subscribe(updateEvents);

    // Subscribe to event bus events
    const unsubscribeUpdated = eventBus.on(CALENDAR_EVENTS.UPDATED, updateEvents);
    const unsubscribeAdded = eventBus.on(CALENDAR_EVENTS.ADDED, updateEvents);
    const unsubscribeDeleted = eventBus.on(CALENDAR_EVENTS.DELETED, updateEvents);
    const unsubscribeModified = eventBus.on(CALENDAR_EVENTS.MODIFIED, updateEvents);

    return () => {
      unsubscribe();
      unsubscribeUpdated();
      unsubscribeAdded();
      unsubscribeDeleted();
      unsubscribeModified();
    };
  }, [updateEvents]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    updateEvents
  };
}
