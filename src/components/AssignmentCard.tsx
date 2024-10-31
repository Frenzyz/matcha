import React from 'react';
import { Book, Clock, Trash2 } from 'lucide-react';
import { Assignment } from '../types/assignment';

interface AssignmentCardProps {
  assignment: Assignment;
  onProgressUpdate: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
}

export default function AssignmentCard({ 
  assignment, 
  onProgressUpdate, 
  onDelete 
}: AssignmentCardProps) {
  const dueDate = new Date(assignment.due_date);
  const now = new Date();
  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const getStatusColor = (status: Assignment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'late':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Book className="text-emerald-600" size={24} />
        </div>
        
        <div>
          <span className="text-sm font-medium text-emerald-600">{assignment.course}</span>
          <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
          {assignment.description && (
            <p className="text-sm text-gray-600">{assignment.description}</p>
          )}
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
            <span>Due: {dueDate.toLocaleDateString()}</span>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Past due'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-32">
          <div className="h-2 bg-gray-100 rounded-full">
            <div 
              className={`h-full rounded-full ${getStatusColor(assignment.status)}`}
              style={{ width: `${assignment.progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{assignment.progress}% complete</span>
        </div>
        
        <button 
          onClick={() => onDelete(assignment.id)}
          className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Delete assignment"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}