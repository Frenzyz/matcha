import React, { useState } from 'react';
import { Event } from '../../types/index';
import TodoItem from './TodoItem';
import { Edit2, Trash2, Save, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TodoCategoryProps {
  category: Category;
  events: Event[];
  isDarkMode: boolean;
  isAdvancedMode: boolean;
  categories: Category[];
  index: number;
  onEditCategory: (index: number, name: string, color: string) => void;
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
  const [editedName, setEditedName] = useState(category.name);
  const [editedColor, setEditedColor] = useState(category.color);

  const handleSave = () => {
    if (editedName.trim()) {
      onEditCategory(index, editedName.trim(), editedColor);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedName(category.name);
    setEditedColor(category.color);
    setIsEditing(false);
  };

  return (
    <div 
      className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
      style={{ 
        borderLeft: `4px solid ${category.color}`,
        backgroundColor: isDarkMode 
          ? `${category.color}10` 
          : `${category.color}05` 
      }}
    >
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
            <input
              type="color"
              value={editedColor}
              onChange={(e) => setEditedColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <button 
              onClick={handleSave}
              className="p-1 hover:text-emerald-500"
            >
              <Save size={16} />
            </button>
            <button 
              onClick={handleCancel}
              className="p-1 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center w-full">
            <h3 className="font-medium" style={{ color: category.color }}>
              {category.name}
            </h3>
            {isAdvancedMode && !['Upcoming', 'Completed'].includes(category.name) && (
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
        )}
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No events in this category
          </p>
        ) : (
          events.map((event) => (
            <TodoItem
              key={event.id}
              event={event}
              isDarkMode={isDarkMode}
              categories={categories.filter(cat => 
                cat.name !== category.name && 
                !['Completed'].includes(cat.name)
              )}
              currentCategory={category.name}
              categoryColor={category.color}
              onComplete={() => onCompleteEvent(event.id)}
              onMoveToCategory={(targetCategory) => onMoveEvent(event.id, targetCategory)}
            />
          ))
        )}
      </div>
    </div>
  );
}
