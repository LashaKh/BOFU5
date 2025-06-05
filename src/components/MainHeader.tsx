import React, { Fragment } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Book, Briefcase, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { UserCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Logo SVG component
const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#FFE600" />
    <path d="M18.5 5L7 17.5H14L12.5 27L24 14.5H17L18.5 5Z" fill="#0A0A0A" stroke="#0A0A0A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface MainHeaderProps {
  showHistory?: boolean;
  setShowHistory?: (value: boolean) => void;
  user?: any;
  onShowAuthModal?: () => void;
  onSignOut?: () => Promise<void>;
}

export function MainHeader({
  showHistory, 
  setShowHistory, 
  user: propUser,
  onShowAuthModal,
  onSignOut
}: MainHeaderProps) {
  const [user, setUser] = React.useState(propUser);
  const navigate = useNavigate();

  // Helper function to get display name
  const getDisplayName = (userData: any) => {
    // First check user_metadata.company_name
    if (userData?.user_metadata?.company_name) {
      return userData.user_metadata.company_name;
    }
    // If no company_name in user_metadata, check app_metadata.company_name (used in some Supabase setups)
    if (userData?.app_metadata?.company_name) {
      return userData.app_metadata.company_name;
    }
    // Fallback to email
    return userData?.email || 'User';
  };

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      if (onSignOut) {
        // Use the provided sign out handler
        await onSignOut();
      } else {
        // First sign out from Supabase
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log("Signed out successfully");
        
        // Use React Router for client-side navigation
        navigate('/', { replace: true });
        
        // Show the authentication modal after sign out
        if (onShowAuthModal) {
          setTimeout(() => {
            onShowAuthModal();
          }, 100);
        }
        
        // These state updates should now properly execute with client-side navigation
        if (setShowHistory) {
          setShowHistory(false);
        }
        
        // Show success message
        toast.success('Signed out successfully');
      }
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error('Failed to sign out');
    }
  };

  // Modified navigation handler
  const handleNavigation = (path: string) => {
    // First dispatch the closeModals event to clean up any open modals
    window.dispatchEvent(new CustomEvent('closeModals'));
    
    // Wait a brief moment to ensure cleanup completes
    setTimeout(() => {
      // Then navigate to the desired path
      navigate(path);
      
      // Update history state if navigating to history
      if (path === '/history' && setShowHistory) {
        setShowHistory(true);
      } else if (path === '/' && setShowHistory) {
        setShowHistory(false);
      }
    }, 100);
  };

  return (
    <header className="sticky top-0 z-50 bg-neutral-900 border-b border-primary-500/30 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <motion.div 
              className="flex-shrink-0 flex items-center cursor-pointer"
              onClick={() => handleNavigation('/')}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Logo />
              <span className="ml-3 text-xl font-bold text-yellow-500 hover:text-yellow-400 transition-colors">
                BOFU ai
              </span>
            </motion.div>
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <button
                onClick={() => handleNavigation('/research')}
                className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium py-2 px-4 rounded-md text-sm inline-flex items-center transition-colors"
              >
                <Search size={18} className="mr-2" />
                Analyze Products
              </button>
              {user && (
                <motion.button
                  onClick={() => handleNavigation('/dashboard')}
                  className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70"
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  <Book className="h-5 w-5" />
                  Dashboard
                </motion.button>
              )}
              {showHistory !== undefined && setShowHistory && (
                <motion.button
                  onClick={() => handleNavigation('/history')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2
                    ${showHistory 
                      ? 'bg-gradient-to-r from-secondary-800 to-secondary-700 text-primary-300 border border-primary-500/30 shadow-glow hover:shadow-glow-strong' 
                      : 'text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70'
                    }`}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  <ClockIcon className="h-5 w-5" />
                  History
                </motion.button>
              )}
              {user && (
                <motion.button
                  onClick={() => handleNavigation('/products')}
                  className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70"
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  <Briefcase className="h-5 w-5" />
                  Products
                </motion.button>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary-800/70 text-gray-300 hover:text-primary-300 border border-transparent hover:border-primary-500/20 transition-all">
                  <UserCircleIcon className="h-6 w-6" />
                  <span className="max-w-[150px] truncate">
                    {getDisplayName(user)}
                  </span>
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-150"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-neutral-900 z-[60] opacity-100">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }: { active: boolean }) => (
                          <button
                            onClick={() => handleNavigation('/dashboard')}
                            className={`${
                              active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                            } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                          >
                            <UserCircleIcon className="h-4 w-4 opacity-70" />
                            Dashboard
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }: { active: boolean }) => (
                          <button
                            onClick={() => handleNavigation('/history')}
                            className={`${
                              active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                            } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                          >
                            <ClockIcon className="h-4 w-4 opacity-70" />
                            History
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }: { active: boolean }) => (
                          <button
                            onClick={() => handleNavigation('/products')}
                            className={`${
                              active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                            } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                          >
                            <Briefcase className="h-4 w-4 opacity-70" />
                            Products
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }: { active: boolean }) => (
                          <button
                            onClick={handleSignOut}
                            className={`${
                              active ? 'bg-secondary-600/30 text-primary-300' : 'text-gray-300'
                            } group flex w-full items-center gap-2 px-4 py-3 text-sm transition-colors`}
                          >
                            <LogIn className="h-4 w-4 opacity-70" />
                            Sign Out
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <motion.button
                onClick={() => onShowAuthModal && onShowAuthModal()}
                className="px-5 py-2 bg-gradient-to-r from-primary-500/80 to-yellow-500/80 text-secondary-900 font-medium rounded-lg 
                  transition-all shadow-md hover:shadow-glow-strong hover:from-primary-500 hover:to-yellow-500"
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ y: 1, scale: 0.98 }}
              >
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}