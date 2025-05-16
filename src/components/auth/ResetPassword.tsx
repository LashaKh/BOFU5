import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyPasswordResetToken, updatePassword } from '../../lib/auth';
import toast from 'react-hot-toast';

const passwordStrengthRegex = {
  minLength: /.{6,}/
};

export function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false
  });
  
  const navigate = useNavigate();

  // Verify token when component mounts
  useEffect(() => {
    const checkToken = async () => {
      try {
        const { valid } = await verifyPasswordResetToken();
        setIsTokenValid(valid);
        
        if (!valid) {
          toast.error('Password reset link is invalid or has expired.');
        }
      } catch (error) {
        console.error('Error verifying reset token:', error);
        toast.error('Could not verify reset link.');
        setIsTokenValid(false);
      } finally {
        setIsCheckingToken(false);
      }
    };
    
    checkToken();
  }, []);
  
  // Check password strength
  useEffect(() => {
    setPasswordStrength({
      minLength: passwordStrengthRegex.minLength.test(newPassword)
    });
  }, [newPassword]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    // Check password strength
    const isStrongPassword = Object.values(passwordStrength).every(criteria => criteria);
    if (!isStrongPassword) {
      toast.error('Please ensure your password meets all the strength requirements');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await updatePassword(newPassword);
      toast.success(result.message);
      
      // Redirect to login page after success
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-900">
        <div className="max-w-md w-full p-6 bg-secondary-800 rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-primary-400 mb-4">Verifying Reset Link</h2>
            <div className="flex justify-center">
              <svg className="animate-spin h-8 w-8 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-900">
        <div className="max-w-md w-full p-6 bg-secondary-800 rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-primary-400 mb-4">Invalid Reset Link</h2>
            <p className="text-gray-400 mb-6">This password reset link is invalid or has expired.</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-primary-400 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-900">
      <div className="max-w-md w-full p-6 bg-secondary-800 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-primary-400">Reset Your Password</h2>
          <p className="text-gray-400 mt-2">Create a new secure password</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-400">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-secondary-800 rounded-lg text-gray-200 shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-secondary-800 rounded-lg text-gray-200 shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            {/* Password strength indicators */}
            <div className="bg-secondary-900 p-3 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Password must have:</p>
              <ul className="space-y-1 text-sm">
                <li className={`flex items-center ${passwordStrength.minLength ? 'text-green-500' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordStrength.minLength ? '✓' : '○'}</span> At least 6 characters
                </li>
              </ul>
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-primary-400 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex justify-center items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Reset Password'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
