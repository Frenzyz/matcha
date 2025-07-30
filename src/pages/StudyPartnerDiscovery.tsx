import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userSearchService } from '../services/userSearch';
import { StudyMatchRecommendation, UserSearchResult } from '../types/enhanced-study';
import UserSearch from '../components/user-discovery/UserSearch';
import UserCard from '../components/user-discovery/UserCard';
import { Users, Star, TrendingUp, Loader2 } from 'lucide-react';

export default function StudyPartnerDiscovery() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<StudyMatchRecommendation[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'recommendations'>('recommendations');

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    try {
      setLoadingRecommendations(true);
      const recs = await userSearchService.getStudyRecommendations(12);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleUserSelect = (userResult: UserSearchResult) => {
    setSelectedUser(userResult);
  };

  if (selectedUser) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedUser(null)}
            className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 
                     dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            ← Back to discovery
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <UserCard
                user={selectedUser.user}
                enhanced_profile={selectedUser.enhanced_profile}
                compatibility_score={selectedUser.compatibility_score}
                common_interests={selectedUser.common_interests}
                availability_match={selectedUser.availability_match}
                show_actions={true}
              />
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">
                  Study Compatibility Analysis
                </h3>
                
                {selectedUser.compatibility_score && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <span className="text-lg font-medium dark:text-white">
                        {selectedUser.compatibility_score}% Match
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${selectedUser.compatibility_score}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {selectedUser.common_interests.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3 dark:text-white">
                      Common Interests ({selectedUser.common_interests.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.common_interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 
                                   text-emerald-800 dark:text-emerald-300 rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 dark:text-white">Study Style</h4>
                    <p className="text-gray-600 dark:text-gray-300 capitalize">
                      {selectedUser.enhanced_profile?.study_style || 'Not specified'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 dark:text-white">Preferred Group Size</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      {selectedUser.enhanced_profile?.preferred_group_size || 'Not specified'} people
                    </p>
                  </div>

                  {selectedUser.enhanced_profile?.bio && (
                    <div>
                      <h4 className="font-medium mb-2 dark:text-white">About</h4>
                      <p className="text-gray-600 dark:text-gray-300">
                        {selectedUser.enhanced_profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Find Study Partners
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with fellow students who share your interests and study goals
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recommendations
            </div>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Search All
            </div>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'recommendations' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-semibold dark:text-white">
                Recommended for You
              </h2>
              <button
                onClick={loadRecommendations}
                disabled={loadingRecommendations}
                className="ml-auto text-sm text-emerald-600 hover:text-emerald-700 
                         dark:text-emerald-400 dark:hover:text-emerald-300 
                         disabled:opacity-50 transition-colors"
              >
                {loadingRecommendations ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingRecommendations ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((rec) => {
                  const userResult: UserSearchResult = {
                    user: rec.user,
                    compatibility_score: rec.compatibility_score,
                    common_interests: rec.matching_factors.common_interests,
                    availability_match: rec.matching_factors.availability_overlap > 0.3
                  };
                  
                  return (
                    <UserCard
                      key={rec.user.id}
                      user={rec.user}
                      compatibility_score={rec.compatibility_score}
                      common_interests={rec.matching_factors.common_interests}
                      show_actions={true}
                      onClick={() => handleUserSelect(userResult)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No recommendations yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Complete your profile to get personalized study partner recommendations
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Search All Users
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <UserSearch onUserSelect={handleUserSelect} />
        )}
      </div>
    </div>
  );
}