import React from 'react';
import { Book, Clock, CheckCircle } from 'lucide-react';

export default function Assignments() {
  const assignments = [
    {
      course: "ITSC 3155",
      title: "Software Engineering Project Phase 2",
      dueDate: "March 15, 2024",
      timeLeft: "3 days",
      progress: 75
    },
    {
      course: "MATH 2164",
      title: "Linear Algebra Assignment 4",
      dueDate: "March 18, 2024",
      timeLeft: "6 days",
      progress: 30
    },
    {
      course: "ENGL 2116",
      title: "Technical Writing Report",
      dueDate: "March 20, 2024",
      timeLeft: "8 days",
      progress: 0
    }
  ];

  return (
    <div className="space-y-4">
      {assignments.map((assignment, index) => (
        <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Book className="text-emerald-600" size={24} />
            </div>
            
            <div>
              <span className="text-sm font-medium text-emerald-600">{assignment.course}</span>
              <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>Due: {assignment.dueDate}</span>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{assignment.timeLeft} left</span>
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