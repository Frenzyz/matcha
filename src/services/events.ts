import { Event } from '../types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { retryOperation } from '../utils/retryOperation';

export class EventService {
    static async updateEvent(event: Event): Promise<void> {
        if (!event.id || !event.user_id) {
            throw new Error('Event ID and user ID are required');
        }

        try {
            // Extract only the database fields, excluding layout properties
            const {
                id,
                user_id,
                title,
                description,
                location,
                start_time,
                end_time,
                type,
                status,
                source,
                google_event_id,
            } = event;

            const { error } = await retryOperation(() =>
                supabase
                    .from('calendar_events')
                    .update({
                        title,
                        description,
                        location,
                        start_time,
                        end_time,
                        type,
                        status,
                        source,
                        google_event_id,
                        updated_at: new Date().toISOString(),
                    })
                    .match({ id, user_id }),
            );

            if (error) throw error;
        } catch (error) {
            logger.error('Error updating event:', error);
            throw error;
        }
    }

    static async deleteEvent(eventId: string, userId: string): Promise<void> {
        if (!eventId || !userId) {
            throw new Error('Event ID and user ID are required');
        }

        try {
            const { error } = await retryOperation(() =>
                supabase
                    .from('calendar_events')
                    .delete()
                    .match({ id: eventId, user_id: userId }),
            );

            if (error) throw error;
        } catch (error) {
            logger.error('Error deleting event:', error);
            throw error;
        }
    }

    static async fetchEvents(userId: string): Promise<Event[]> {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const { data, error } = await retryOperation(() =>
                supabase
                    .from('calendar_events')
                    .select(
                        'id, user_id, title, description, location, start_time, end_time, type, status, source, google_event_id',
                    )
                    .eq('user_id', userId)
                    .order('start_time', { ascending: true }),
            );

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error('Error fetching events:', error);
            throw error;
        }
    }

    static async addEvent(event: Event, userId: string): Promise<void> {
        try {
            const { error } = await retryOperation(() =>
                supabase.from('calendar_events').insert([
                    {
                        title: event.title,
                        description: event.description,
                        location: event.location,
                        start_time: event.start_time,
                        end_time: event.end_time,
                        type: event.type,
                        status: event.status || 'pending',
                        source: event.source,
                        user_id: userId,
                        google_event_id: event.google_event_id,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ]),
            );

            if (error) throw error;
        } catch (error) {
            logger.error('Error adding event:', error);
            throw error;
        }
    }
}
