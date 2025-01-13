import React from 'react';
import { Calendar, DollarSign, Award, BookOpen, ExternalLink } from 'lucide-react';
import { Scholarship } from '../types';
import { useAuth } from '../context/AuthContext';
import { ScholarshipService } from '../services/scholarships';
import { formatCurrency } from '../utils/format';

interface ScholarshipCardProps {
  scholarship: Scholarship;
  onUpdate: () => void;
}

export default function ScholarshipCard({ scholarship, onUpdate }: ScholarshipCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAddToCalendar = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      await ScholarshipService.addToCalendar(scholarship, user.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      await ScholarshipService.saveUserScholarship(scholarship, user.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scholarship');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'merit':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'need-based':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'research':
        return 'bg-purple-50 text-purple-700 ring-purple-600/20';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-600/20';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {scholarship.title}
          </h3>
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getTypeColor(scholarship.type)}`}>
            {scholarship.type}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <DollarSign className="h-5 w-5 mr-2" />
            <span>{formatCurrency(scholarship.amount)}</span>
          </div>

          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <Calendar className="h-5 w-5 mr-2" />
            <span>Deadline: {new Date(scholarship.deadline).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <Award className="h-5 w-5 mr-2" />
            <span>{scholarship.awards} award{scholarship.awards !== 1 ? 's' : ''}</span>
          </div>

          {scholarship.majors && scholarship.majors.length > 0 && (
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <BookOpen className="h-5 w-5 mr-2" />
              <span>{scholarship.majors.join(', ')}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {scholarship.description}
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            Save
          </button>
          
          <button
            onClick={handleAddToCalendar}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Add to Calendar
          </button>

          {scholarship.url && (
            <a
              href={scholarship.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
