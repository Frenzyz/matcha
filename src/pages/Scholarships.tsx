import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, GraduationCap } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useUser } from '../hooks/useUser';
import { ScholarshipService } from '../services/scholarships';
import { Scholarship } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function Scholarships() {
  const { isDarkMode } = useThemeStore();
  const { userData } = useUser();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchScholarships = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ScholarshipService.fetchScholarships(userData?.major);
        setScholarships(data);
      } catch (err) {
        setError('Failed to load scholarships. Please try again later.');
        console.error('Error fetching scholarships:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScholarships();
  }, [userData?.major]);

  const filteredScholarships = scholarships.filter(scholarship =>
    scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scholarship.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCalendar = async (scholarship: Scholarship) => {
    if (!userData?.id) return;

    try {
      await ScholarshipService.addScholarshipDeadline(scholarship, userData.id);
      alert('Deadline added to calendar!');
    } catch (err) {
      console.error('Error adding to calendar:', err);
      alert('Failed to add deadline to calendar');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={`min-h-screen pt-16 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Scholarship Opportunities
            </h1>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Scholarships matching your major: {userData?.major || 'All majors'}
            </p>
          </div>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} size={20} />
            <input
              type="text"
              placeholder="Search scholarships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 placeholder-gray-500'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
          </div>
        </div>

        {filteredScholarships.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <h3 className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              No scholarships found
            </h3>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              Try adjusting your search or check back later for new opportunities.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredScholarships.map((scholarship) => (
              <div
                key={scholarship.id}
                className={`rounded-lg shadow-sm p-6 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {scholarship.title}
                </h3>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {scholarship.description}
                </p>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <p className="font-medium text-emerald-600">Amount: {scholarship.amount}</p>
                  <p>Deadline: {new Date(scholarship.deadline).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <a
                    href={scholarship.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    Apply Now <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => addToCalendar(scholarship)}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    Add to Calendar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={`mt-8 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pt-8`}>
          <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            External Scholarship Resources
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: 'Scholarship America',
                url: 'https://scholarshipamerica.org/students/browse-scholarships/'
              },
              {
                name: 'Bold.org Scholarships',
                url: 'https://bold.org/scholarships/'
              },
              {
                name: 'First in Family Scholarships',
                url: 'https://www.scholarships.com/financial-aid/college-scholarships/scholarships-by-type/first-in-family-scholarships'
              }
            ].map((resource) => (
              <a
                key={resource.name}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-4 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700' 
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <ExternalLink size={20} className="text-emerald-600" />
                <span>{resource.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}