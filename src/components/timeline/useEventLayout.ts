import { useMemo } from 'react';
import { Event } from '../../types';

export interface EventWithLayout extends Event {
  width: number;
  left: number;
}

export function useEventLayout(events: Event[]): EventWithLayout[] {
  return useMemo(() => {
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const columns: { end: number; events: EventWithLayout[] }[] = [];
    const layoutEvents: EventWithLayout[] = [];

    sortedEvents.forEach(event => {
      const start = new Date(event.start_time).getTime();
      const end = new Date(event.end_time).getTime();

      // Find a column where this event can fit
      let column = columns.findIndex(col => col.end <= start);
      
      // If no column found, create a new one
      if (column === -1) {
        column = columns.length;
        columns.push({ end: 0, events: [] });
      }

      // Update column end time
      columns[column].end = end;

      // Find all concurrent events
      const concurrentEvents = columns.flatMap(col => 
        col.events.filter(e => {
          const eStart = new Date(e.start_time).getTime();
          const eEnd = new Date(e.end_time).getTime();
          return (start <= eEnd && end >= eStart);
        })
      );

      const totalConcurrent = concurrentEvents.length + 1;
      const width = 0.95 / totalConcurrent; // Leave small gap between events

      // Update positions of concurrent events
      concurrentEvents.forEach((e, idx) => {
        e.width = width;
        e.left = idx * width;
      });

      // Add new event with layout properties
      const layoutEvent: EventWithLayout = {
        ...event,
        width,
        left: concurrentEvents.length * width
      };

      columns[column].events.push(layoutEvent);
      layoutEvents.push(layoutEvent);
    });

    return layoutEvents;
  }, [events]);
}