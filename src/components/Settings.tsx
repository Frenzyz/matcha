// Previous Settings.tsx content remains the same, but remove these lines:
<div>
  <label htmlFor="calendar-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    Canvas Calendar URL {hasExistingCalendar && '(Already configured)'}
  </label>
  <div className="mt-1 relative rounded-md shadow-sm">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Key className="h-5 w-5 text-gray-400" />
    </div>
    <input
      type="url"
      id="calendar-url"
      value={calendarUrl}
      onChange={(e) => setCalendarUrl(e.target.value)}
      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-theme-primary focus:border-theme-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      placeholder={hasExistingCalendar ? '••••••••' : 'Enter your Canvas calendar URL'}
    />
  </div>
  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
    Find your calendar URL in Canvas under Calendar &gt; Calendar Feed
  </p>
</div>