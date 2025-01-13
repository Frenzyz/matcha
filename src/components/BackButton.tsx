import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="fixed top-20 left-4 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow duration-200 z-50"
      aria-label="Go back"
    >
      <ArrowLeft className="text-gray-600" size={24} />
    </button>
  );
}
