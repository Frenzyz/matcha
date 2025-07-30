import React from 'react';
import { UserSearchFilters } from '../../types/enhanced-study';

interface SearchFiltersProps {
  filters: UserSearchFilters;
  onFiltersChange: (filters: Partial<UserSearchFilters>) => void;
}

const STUDY_STYLES = [
  { value: 'collaborative', label: 'Collaborative' },
  { value: 'independent', label: 'Independent' },
  { value: 'hybrid', label: 'Hybrid' }
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

const COMMON_MAJORS = [
  'Computer Science',
  'Engineering',
  'Business',
  'Biology',
  'Chemistry',
  'Mathematics',
  'Psychology',
  'English',
  'History',
  'Physics'
];

const COMMON_INTERESTS = [
  'Programming',
  'Data Science',
  'Web Development',
  'Machine Learning',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Business',
  'Marketing',
  'Finance',
  'Psychology',
  'Literature',
  'History',
  'Art',
  'Music'
];

export default function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const handleInputChange = (field: keyof UserSearchFilters, value: any) => {
    onFiltersChange({ [field]: value });
  };

  const handleInterestToggle = (interest: string) => {
    const currentInterests = filters.interests || [];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    
    onFiltersChange({ interests: newInterests });
  };

  const clearFilters = () => {
    onFiltersChange({
      major: undefined,
      interests: [],
      study_style: undefined,
      availability_now: undefined,
      difficulty_level: undefined,
      preferred_group_size: undefined,
      timezone: undefined
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'query') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Search Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 
                     dark:hover:text-emerald-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Major Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Major
          </label>
          <select
            value={filters.major || ''}
            onChange={(e) => handleInputChange('major', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Any major</option>
            {COMMON_MAJORS.map(major => (
              <option key={major} value={major}>{major}</option>
            ))}
          </select>
        </div>

        {/* Study Style Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Study Style
          </label>
          <select
            value={filters.study_style || ''}
            onChange={(e) => handleInputChange('study_style', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Any style</option>
            {STUDY_STYLES.map(style => (
              <option key={style.value} value={style.value}>{style.label}</option>
            ))}
          </select>
        </div>

        {/* Group Size Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preferred Group Size
          </label>
          <select
            value={filters.preferred_group_size || ''}
            onChange={(e) => handleInputChange('preferred_group_size', 
              e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Any size</option>
            {[2, 3, 4, 5, 6, 8, 10].map(size => (
              <option key={size} value={size}>{size} people</option>
            ))}
          </select>
        </div>
      </div>

      {/* Availability Toggle */}
      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={filters.availability_now || false}
            onChange={(e) => handleInputChange('availability_now', e.target.checked || undefined)}
            className="w-4 h-4 text-emerald-600 border-gray-300 dark:border-gray-600 rounded
                     focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Show only users available now
          </span>
        </label>
      </div>

      {/* Interests Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Interests
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {COMMON_INTERESTS.map(interest => {
            const isSelected = (filters.interests || []).includes(interest);
            return (
              <button
                key={interest}
                onClick={() => handleInterestToggle(interest)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-300'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
        {filters.interests && filters.interests.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {filters.interests.length} interest{filters.interests.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
    </div>
  );
}