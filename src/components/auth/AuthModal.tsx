import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '../../lib/supabase';
import { registerUser, signIn, sendPasswordResetEmail } from '../../lib/auth';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowAdminLogin?: () => void;
}

export function AuthModal({ isOpen, onClose, onShowAdminLogin }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(isOpen);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: ''
  });
  const navigate = useNavigate();
  
  // Check if there's a current user
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Effect to get the current user
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Use our registerUser function for sign up
        await registerUser(
          formData.email,
          formData.password,
          formData.companyName.trim()
        );
        
        // After successful registration, sign in automatically
        await signIn(formData.email, formData.password);
        
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        setCurrentUser(userData.user);
        
        // Update local state to close modal
        setShowModal(false);
        
        // Call the onClose function
        onClose();
        
        toast.success('Account created successfully!');
        
        // Navigate to dashboard after successful registration and sign in
        navigate('/', { replace: true });
      } else {
        // Use our signIn function for login
        const signInResult = await signIn(formData.email, formData.password);
        
        // Mark as signed in (which will allow modal to close)
        setCurrentUser(signInResult.user);
        
        // Update local state to close modal
        setShowModal(false);
        
        // Call the onClose function
        onClose();
        
        toast.success('Signed in successfully!');
        
        // Navigate to dashboard after successful sign in
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate email
      if (!formData.email || !formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      // Send password reset email
      const result = await sendPasswordResetEmail(formData.email);
      toast.success(result.message);
      
      // Reset form and return to login view
      setIsForgotPassword(false);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (onShowAdminLogin) {
      onShowAdminLogin();
    }
  };

  // Only allow closing the modal if a user is logged in
  const handleClose = currentUser ? onClose : () => {};

  return (
    <Transition appear show={showModal} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-gray-900 border border-primary-500/20 shadow-glow p-6 text-left align-middle transition-all">
                <div className="absolute top-4 right-4">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-white focus:outline-none"
                    onClick={handleClose}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-primary-500/20 rounded-xl p-3 shadow-glow">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="32" height="32" rx="8" fill="#FFE600" />
                      <path d="M18.5 5L7 17.5H14L12.5 27L24 14.5H17L18.5 5Z" fill="#0A0A0A" stroke="#0A0A0A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-xl font-medium leading-6 text-center text-white mb-4"
                >
                  {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Welcome Back')}
                </Dialog.Title>

                <div className="mt-4">
                  {isForgotPassword ? (
                    <form className="space-y-4" onSubmit={handleForgotPassword}>
                      <div>
                        <div className="mb-4">
                          <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-white rounded-lg text-black placeholder:text-gray-500 shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                          />
                        </div>

                        <div>
                          <button
                            type="submit"
                            className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex justify-center items-center"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : 'Send Reset Instructions'}
                          </button>
                        </div>
                        
                        <div className="mt-4 text-center">
                          <button
                            type="button"
                            onClick={() => setIsForgotPassword(false)}
                            className="text-sm text-primary-400 hover:text-primary-300"
                          >
                            Back to Login
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                      <div>
                        <div className="mb-4">
                          <label htmlFor="email" className="block text-sm font-medium text-gray-400">
                            Email
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-white rounded-lg text-black placeholder:text-gray-500 shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                          />
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between items-center">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-400">
                              Password
                            </label>
                            {!isSignUp && (
                              <button 
                                type="button"
                                onClick={() => setIsForgotPassword(true)}
                                className="text-xs text-primary-400 hover:text-primary-300"
                              >
                                Forgot password?
                              </button>
                            )}
                          </div>
                          <input
                            type="password"
                            id="password"
                            name="password"
                            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-white rounded-lg text-black placeholder:text-gray-500 shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                          />
                        </div>

                        {isSignUp && (
                          <div className="mb-4">
                            <label htmlFor="companyName" className="block text-sm font-medium text-gray-400">
                              Company Name
                            </label>
                            <input
                              type="text"
                              id="companyName"
                              name="companyName"
                              className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-white rounded-lg text-black placeholder:text-gray-500 shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                              placeholder="Your company"
                              value={formData.companyName}
                              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                              required={isSignUp}
                            />
                          </div>
                        )}

                        <div>
                          <button
                            type="submit"
                            className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex justify-center items-center"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : isSignUp ? 'Sign Up' : 'Sign In'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                  
                  {/* Toggle between sign in and sign up */}
                  {!isForgotPassword && (
                    <div className="mt-4 text-center border-t border-gray-700 pt-4">
                      <p className="text-sm text-gray-400">
                        {isSignUp ? 'Already have an account?' : 'Don\'t have an account?'}
                        <button
                          type="button"
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="ml-2 text-primary-400 hover:text-primary-300 font-medium"
                        >
                          {isSignUp ? 'Sign In' : 'Create Account'}
                        </button>
                      </p>
                    </div>
                  )}
                  
                  {/* Admin Login option */}
                  {onShowAdminLogin && !isForgotPassword && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={handleAdminLogin}
                        className="text-sm text-gray-300 hover:text-white"
                      >
                        Admin Login
                      </button>
                    </div>
                  )}
                  

                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
