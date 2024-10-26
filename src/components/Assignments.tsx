import React, { useState, useEffect } from 'react';
import { Book, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Assignment } from '../types';

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchAssignments = async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (!error && data) {
        setAssignments(data);
      }
    };

    fetchAssignments();
  }, [user]);

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Book className="text-emerald-600" size={24} />
            </div>
            
            <div>
              <span className="text-sm font-medium text-emerald-600">{assignment.course}</span>
              <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{Math.ceil((new Date(assignment.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left</span>
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
              <span className="text-sm text-gray-600">{assignment.progress}% complete</span>
            </div>
            
            <button className="p-2 hover:bg-gray-50 rounded-lg">
              <CheckCircle size={20} className="text-gray-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}