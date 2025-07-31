import React, { useState, useEffect } from 'react';
    import { Book, Clock, CheckCircle } from 'lucide-react';
    import { supabase } from '../config/supabase';
    import { useAuth } from '../context/AuthContext';
    import { Assignment } from '../types/index';
    import { logger } from '../utils/logger';
    import { useErrorHandler } from '../hooks/useErrorHandler';
    import { retryOperation } from '../config/supabase';
    import LoadingSpinner from './LoadingSpinner';
    import ErrorMessage from './ErrorMessage';

    const CACHE_KEY = 'cached_assignments';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    export default function Assignments() {
      const { user } = useAuth();
      const [assignments, setAssignments] = useState<Assignment[]>([]);
      const [loading, setLoading] = useState(true);
      const { error, handleError, clearError } = useErrorHandler();

      useEffect(() => {
        if (!user) return;

        const fetchAssignments = async () => {
          try {
            setLoading(true);

            // Try to get assignments from local cache first
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
              const { data, timestamp } = JSON.parse(cachedData);
              if (Date.now() - timestamp < CACHE_DURATION) {
                setAssignments(data);
                setLoading(false);
                return;
              }
            }

            const { data, error: fetchError } = await retryOperation(() =>
              supabase
                .from('assignments')
                .select('*')
                .eq('user_id', user.id)
                .order('due_date', { ascending: true })
            );

            if (fetchError) {
              throw new Error(`Failed to fetch assignments: ${fetchError.message}`);
            }

            // Cache the assignments
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              data: data || [],
              timestamp: Date.now()
            }));

            setAssignments(data || []);
          } catch (err) {
            handleError(err, 'fetchAssignments');
            
            // Try to use cached data as fallback
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
              const { data } = JSON.parse(cachedData);
              setAssignments(data);
            }
          } finally {
            setLoading(false);
          }
        };

        fetchAssignments();
      }, [user, handleError]);

      const handleStatusUpdate = async (assignmentId: string, status: 'completed' | 'in_progress') => {
        if (!user) return;

        try {
          const { error: updateError } = await retryOperation(() =>
            supabase
              .from('assignments')
              .update({ 
                status,
                progress: status === 'completed' ? 100 : assignments.find(a => a.id === assignmentId)?.progress || 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', assignmentId)
              .eq('user_id', user.id)
          );

          if (updateError) {
            throw new Error(`Failed to update assignment: ${updateError.message}`);
          }

          // Optimistically update the local state
          const updatedAssignments = assignments.map(assignment => 
            assignment.id === assignmentId 
              ? { ...assignment, status, progress: status === 'completed' ? 100 : assignment.progress }
              : assignment
          );

          setAssignments(updatedAssignments);

          // Update cache
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: updatedAssignments,
            timestamp: Date.now()
          }));
        } catch (err) {
          handleError(err, 'handleStatusUpdate');
        }
      };

      if (loading) return <LoadingSpinner />;

      if (error) {
        return (
          <ErrorMessage
            message={error.message}
            onDismiss={clearError}
          />
        );
      }

      if (assignments.length === 0) {
        return (
          <div className="text-center py-8 text-gray-500">
            No assignments due
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div 
              key={assignment.id} 
              className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Book className="text-emerald-600" size={24} />
                </div>
                
                <div>
                  <span className="text-sm font-medium text-emerald-600">
                    {assignment.course}
                  </span>
                  <h3 className="font-semibold text-gray-800">
                    {assignment.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span>
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>
                        {Math.ceil(
                          (new Date(assignment.due_date).getTime() - Date.now()) / 
                          (1000 * 60 * 60 * 24)
                        )} days left
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32">
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${assignment.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {assignment.progress}% complete
                  </span>
                </div>
                
                <button 
                  onClick={() => handleStatusUpdate(
                    assignment.id, 
                    assignment.status === 'completed' ? 'in_progress' : 'completed'
                  )}
                  className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  aria-label={assignment.status === 'completed' ? 'Mark as in progress' : 'Mark as completed'}
                >
                  <CheckCircle 
                    size={20} 
                    className={assignment.status === 'completed' ? 'text-emerald-500' : 'text-gray-400'} 
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }
