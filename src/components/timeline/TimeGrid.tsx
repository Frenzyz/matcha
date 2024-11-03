import React from 'react';
import { format } from 'date-fns';

interface TimeGridProps {
  isDarkMode: boolean;
}

export default function TimeGrid({ isDarkMode }: TimeGridProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="absolute inset-0">
      {/* Time labels column */}
      <div className="w-20 flex-shrink-0 sticky left-0 bg-inherit z-10">
        {hours.map((hour) => (
          <div 
            key={hour} 
            className="h-[60px] flex items-center justify-end pr-4 relative"
          >
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {format(new Date().setHours(hour, 0), 'h:mm a')}
            </span>
          </div>
        ))}
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 ml-20">
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            {/* Hour line */}
            <div 
              className={`absolute w-full border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
              style={{ top: `${hour * 60}px` }}
            />
            
            {/* Half-hour line */}
            <div 
              className={`absolute w-full border-t ${
                isDarkMode ? 'border-gray-700/50' : 'border-gray-100'
              } border-dashed`}
              style={{ top: `${hour * 60 + 30}px` }}
            />

            {/* Current time indicator */}
            {hour === new Date().getHours() && (
              <div 
                className="absolute w-full flex items-center z-10"
                style={{ 
                  top: `${hour * 60 + (new Date().getMinutes())}px` 
                }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 border-t border-red-500" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}