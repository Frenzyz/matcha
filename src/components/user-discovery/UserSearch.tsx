import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Users, Loader2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { userSearchService } from '../../services/userSearch';
import { UserSearchFilters, UserSearchResult } from '../../types/enhanced-study';
import UserCard from './UserCard';
import SearchFilters from './SearchFilters';

interface UserSearchProps {
  onUserSelect?: (user: UserSearchResult) => void;
  showActions?: boolean;
  initialFilters?: Partial<UserSearchFilters>;
}

export default function UserSearch({ 
  onUserSelect, 
  showActions = true, 
  initialFilters = {} 
}: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<UserSearchFilters>({
    query: '',
    ...initialFilters
  });
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 500);

  const performSearch = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const searchFilters: UserSearchFilters = {
        ...filters,
        query: debouncedQuery.trim() || undefined
      };

      const response = await userSearchService.searchUsers(searchFilters, page, 20);
      
      if (page === 1) {
        setResults(response.users);
      } else {
        setResults(prev => [...prev, ...response.users]);
      }
      
      setTotalCount(response.total_count);
      setCurrentPage(page);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search users';
      setError(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters]);

  useEffect(() => {
    performSearch(1);
  }, [performSearch]);

  const handleLoadMore = () => {
    if (!loading && results.length < totalCount) {
      performSearch(currentPage + 1);
    }
  };

  const handleFiltersChange = (newFilters: Partial<UserSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilters({ query: '', ...initialFilters });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <Users className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold dark:text-white">Discover Study Partners</h2>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, major, or interests..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                     placeholder-gray-500 dark:placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 
                     hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {Object.keys(filters).some(key => filters[key as keyof UserSearchFilters] && key !== 'query') && (
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            )}
          </button>

          {totalCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalCount} user{totalCount !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Search Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                        rounded-lg p-4 text-red-700 dark:text-red-400">
            <p>{error}</p>
            <button
              onClick={() => performSearch(1)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading && results.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No users found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Try adjusting your search criteria or filters
            </p>
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((result) => (
                <UserCard
                  key={result.user.id}
                  user={result.user}
                  enhanced_profile={result.enhanced_profile}
                  compatibility_score={result.compatibility_score}
                  common_interests={result.common_interests}
                  availability_match={result.availability_match}
                  show_actions={showActions}
                  onClick={() => onUserSelect?.(result)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {results.length < totalCount && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white 
                           rounded-lg hover:bg-emerald-700 disabled:opacity-50 
                           disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Load More ({totalCount - results.length} remaining)
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}