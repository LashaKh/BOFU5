import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, User, Calendar, FileText, Mail, Building2, ChevronDown, X, Loader2 } from 'lucide-react';
import { adminUsersApi } from '../../lib/adminApi';
import type { UserProfile } from '../../types/adminApi';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface UserSelectorProps {
  onUserSelect: (user: UserProfile) => void;
  selectedUser?: UserProfile | null;
  className?: string;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  onUserSelect,
  selectedUser,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await adminUsersApi.getUsers({
          search: term,
          limit: 20
        });

        if (error) {
          setError(error.error);
          toast.error(`Search failed: ${error.error}`);
          setUsers([]);
        } else if (data) {
          setUsers(data.users);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        toast.error(errorMessage);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Effect to trigger search when searchTerm changes
  useEffect(() => {
    if (searchTerm.trim()) {
      debouncedSearch(searchTerm);
    } else {
      setUsers([]);
      setIsDropdownOpen(false);
    }
  }, [searchTerm, debouncedSearch]);

  // Handle user selection
  const handleUserSelect = (user: UserProfile) => {
    onUserSelect(user);
    setSearchTerm('');
    setIsDropdownOpen(false);
    setUsers([]);
  };

  // Clear selection
  const clearSelection = () => {
    onUserSelect(null as any);
    setSearchTerm('');
    setIsDropdownOpen(false);
    setUsers([]);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filtered users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowercaseSearch = searchTerm.toLowerCase();
    return users.filter(user => 
      user.email.toLowerCase().includes(lowercaseSearch) ||
      user.company_name.toLowerCase().includes(lowercaseSearch) ||
      user.id.toLowerCase().includes(lowercaseSearch)
    );
  }, [users, searchTerm]);

  return (
    <div className={`relative ${className}`}>
      {/* Selected User Display */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{selectedUser.email}</h3>
                <p className="text-sm text-gray-600">{selectedUser.company_name}</p>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Created: {formatDate(selectedUser.created_at)}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <FileText className="w-4 h-4 mr-2" />
              <span>{selectedUser.article_count} articles</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (filteredUsers.length > 0) {
                setIsDropdownOpen(true);
              }
            }}
            placeholder="Search users by email, company, or ID..."
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown Results */}
        <AnimatePresence>
          {isDropdownOpen && filteredUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
            >
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.email}
                        </p>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {user.article_count} articles
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Building2 className="w-3 h-3 mr-1" />
                        <span className="truncate">{user.company_name}</span>
                        <span className="mx-2">•</span>
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>{formatDate(user.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Results Message */}
        {isDropdownOpen && searchTerm.length >= 2 && filteredUsers.length === 0 && !isLoading && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-4 ring-1 ring-black ring-opacity-5">
            <div className="text-center text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No users found for "{searchTerm}"</p>
              <p className="text-xs mt-1">Try searching by email, company name, or user ID</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute z-10 mt-1 w-full bg-red-50 border border-red-200 rounded-md py-3 px-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Search Help Text */}
      {!selectedUser && searchTerm.length < 2 && (
        <p className="mt-2 text-sm text-gray-500">
          Start typing to search for users by email, company name, or ID
        </p>
      )}
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
} 