import React from 'react';
import CalendarAssistantChat from '../components/calendar-assistant/CalendarAssistantChat';

export default function CalendarAssistantPage() {
  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm h-full">
        <CalendarAssistantChat />
      </div>
    </div>
  );
}