import { useState, useCallback } from 'react';
import { Event } from '../types';
import { EventService } from '../services/events';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

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

  const addEvent = useCallback(async (event: Event) => {
    if (!user) return;

    try {
      setError(null);
      await EventService.addEvent(event, user.id);
      await fetchEvents(); // Refresh events after adding
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add event';
      setError(message);
      logger.error('Error adding event:', err);
      throw err;
    }
  }, [user, fetchEvents]);

  const updateEvent = useCallback(async (event: Event) => {
    if (!user) return;

    try {
      setError(null);
      await EventService.updateEvent(event);
      
      // Optimistically update local state
      setEvents(prev => prev.map(e => 
        e.id === event.id ? event : e
      ));
      
      // Refresh events to ensure consistency
      await fetchEvents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update event';
      setError(message);
      logger.error('Error updating event:', err);
      throw err;
    }
  }, [user, fetchEvents]);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!user) return;

    try {
      setError(null);
      await EventService.deleteEvent(eventId, user.id);
      
      // Optimistically update local state
      setEvents(prev => prev.filter(e => e.id !== eventId));
      
      // Refresh events to ensure consistency
      await fetchEvents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      setError(message);
      logger.error('Error deleting event:', err);
      throw err;
    }
  }, [user, fetchEvents]);

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