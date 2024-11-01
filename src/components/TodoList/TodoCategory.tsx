import React, { useState } from 'react';
import { Event } from '../../types';
import TodoItem from './TodoItem';
import { Edit2, Trash2, Save, X } from 'lucide-react';

interface TodoCategoryProps {
  category: string;
  events: Event[];
  isDarkMode: boolean;
  isAdvancedMode: boolean;
  categories: string[];
  index: number;
  onEditCategory: (name: string) => void;
  onDeleteCategory: () => void;
  onCompleteEvent: (eventId: string) => void;
  onMoveEvent: (eventId: string, targetCategory: string) => void;
}

export default function TodoCategory({
  category,
  events,
  isDarkMode,
  isAdvancedMode,
  categories,
  index,
  onEditCategory,
  onDeleteCategory,
  onCompleteEvent,
  onMoveEvent
}: TodoCategoryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category);

  const handleSave = () => {
    if (editedName.trim()) {
      onEditCategory(editedName.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedName(category);
    setIsEditing(false);
  };

  const handleMoveEvent = (eventId: string, targetCategory: string) => {
    onMoveEvent(eventId, targetCategory);
  };

  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
      <div className="flex justify-between items-center mb-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              autoFocus
            />
            <button onClick={handleSave} className="p-1 hover:text-emerald-500">
              <Save size={16} />
            </button>
            <button onClick={handleCancel} className="p-1 hover:text-red-500">
              <X size={16} />
            </button>
          </div>
        ) : (
          <h3 className="font-medium">{category}</h3>
        )}

        {isAdvancedMode && !['Upcoming', 'Completed'].includes(category) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:text-emerald-500"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={onDeleteCategory}
              className="p-1 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No events in this category
          </p>
        ) : (
          events.map((event, index) => (
            <TodoItem
              key={event.id}
              event={event}
              index={index}
              isDarkMode={isDarkMode}
              categories={categories}
              currentCategory={category}
              onComplete={() => onCompleteEvent(event.id)}
              onMoveToCategory={(targetCategory) => handleMoveEvent(event.id, targetCategory)}
            />
          ))
        )}
      </div>
    </div>
  );
}