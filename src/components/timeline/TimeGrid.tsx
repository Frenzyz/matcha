import React from 'react';
import { format } from 'date-fns';

interface TimeGridProps {
  isDarkMode: boolean;
}

export default function TimeGrid({ isDarkMode }: TimeGridProps) {
  return (
    <>
      <div className="w-24 flex-shrink-0 sticky left-0 bg-inherit z-10">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="h-[60px] flex items-center justify-end pr-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date().setHours(i, 0), 'h:mm a')}
            </span>
          </div>
        ))}
      </div>
      <div className="flex-1 relative border-l border-gray-200 dark:border-gray-700">
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            className="absolute w-full h-[60px] border-b border-gray-200 dark:border-gray-700/50"
            style={{ top: `${i * 60}px` }}
          />
        ))}
      </div>
    </>
  );
}