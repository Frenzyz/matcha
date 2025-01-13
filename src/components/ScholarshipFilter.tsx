import React from 'react';
import { Search, Filter } from 'lucide-react';

interface ScholarshipFilterProps {
  filters: {
    major: string;
    type: string;
    minAmount: number;
  };
  onChange: (filters: any) => void;
}

export default function ScholarshipFilter({ filters, onChange }: ScholarshipFilterProps) {
  const types = [
    { value: 'all', label: 'All Types' },
    { value: 'merit', label: 'Merit-Based' },
    { value: 'need-based', label: 'Need-Based' },
    { value: 'research', label: 'Research' },
    { value: 'general', label: 'General' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Major
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={filters.major}
              onChange={(e) => onChange({ ...filters, major: e.target.value })}
              placeholder="Search by major..."
              className="pl-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => onChange({ ...filters, type: e.target.value })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
          >
            {types.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Minimum Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={filters.minAmount}
              onChange={(e) => onChange({ ...filters, minAmount: Number(e.target.value) })}
              className="pl-8 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
