import { useState, useCallback, useEffect } from 'react';
import { Event } from '../types';
import { EventService } from '../services/events';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';
import { eventBus, CALENDAR_EVENTS } from '../services/eventBus';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await EventService.fetchEvents(user.id);
      setEvents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(message);
      logger.error('Error fetching events:', err);
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
    // Subscribe to calendar events
    const unsubscribeUpdated = eventBus.on(CALENDAR_EVENTS.UPDATED, () => {
      fetchEvents();
    });
    
    const unsubscribeAdded = eventBus.on(CALENDAR_EVENTS.ADDED, () => {
      fetchEvents();
    });
    
    const unsubscribeDeleted = eventBus.on(CALENDAR_EVENTS.DELETED, () => {
      fetchEvents();
    });
    
    const unsubscribeModified = eventBus.on(CALENDAR_EVENTS.MODIFIED, () => {
      fetchEvents();
    });

    return () => {
      unsubscribeUpdated();
      unsubscribeAdded();
      unsubscribeDeleted();
      unsubscribeModified();
    };
  }, [fetchEvents]);

  const addEvent = useCallback(async (event: Event) => {
    if (!user) return;

    try {
      setError(null);
      await EventService.addEvent(event, user.id);
      eventBus.emit(CALENDAR_EVENTS.ADDED, event);
      eventBus.emit(CALENDAR_EVENTS.UPDATED);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add event';
      setError(message);
      logger.error('Error adding event:', err);
      throw err;
    }
  }, [user]);

  const updateEvent = useCallback(async (event: Event) => {
    if (!user) return;

    try {
      setError(null);
      await EventService.updateEvent(event);
      eventBus.emit(CALENDAR_EVENTS.MODIFIED);
      eventBus.emit(CALENDAR_EVENTS.UPDATED);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update event';
      setError(message);
      logger.error('Error updating event:', err);
      throw err;
    }
  }, [user]);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!user) return;

    try {
      setError(null);
      await EventService.deleteEvent(eventId, user.id);
      eventBus.emit(CALENDAR_EVENTS.DELETED, { id: eventId });
      eventBus.emit(CALENDAR_EVENTS.UPDATED);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      setError(message);
      logger.error('Error deleting event:', err);
      throw err;
    }
  }, [user]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    setEvents
  };
}