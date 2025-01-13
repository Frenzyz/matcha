import React, { useState, useEffect } from 'react';
import { ScholarshipService } from '../services/scholarships';
import { Scholarship } from '../types';
import ScholarshipCard from './ScholarshipCard';
import ScholarshipFilter from './ScholarshipFilter';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function ScholarshipList() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    major: '',
    type: 'all',
    minAmount: 0
  });

  useEffect(() => {
    loadScholarships();
  }, [filters.major]);

  const loadScholarships = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ScholarshipService.fetchScholarships(filters.major);
      setScholarships(data);
    } catch (err) {
      setError('Failed to load scholarships. Please try again later.');
      console.error('Error loading scholarships:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredScholarships = scholarships
    .filter(s => filters.type === 'all' || s.type === filters.type)
    .filter(s => s.amount >= filters.minAmount)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error}
        onRetry={loadScholarships}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ScholarshipFilter
        filters={filters}
        onChange={setFilters}
      />
      
      {filteredScholarships.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No scholarships found matching your criteria
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredScholarships.map(scholarship => (
            <ScholarshipCard
              key={scholarship.id}
              scholarship={scholarship}
              onUpdate={loadScholarships}
            />
          ))}
        </div>
      )}
    </div>
  );
}
