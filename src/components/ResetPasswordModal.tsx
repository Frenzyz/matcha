import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ResetPasswordModalProps {
  token: string | null;
  onClose: () => void;
}

export default function ResetPasswordModal({ token, onClose }: ResetPasswordModalProps) {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
	e.preventDefault();
	setError('');
	setLoading(true);

	if (newPassword !== confirmPassword) {
	  setError('Passwords do not match');
	  setLoading(false);
	  return;
	}

	try {
	  if (!token) {
		throw new Error('Invalid or missing token');
	  }
	  await resetPassword(newPassword, token);
	  onClose();
	  navigate('/login', { replace: true });
	} catch (err) {
	  setError(err instanceof Error ? err.message : 'Failed to reset password');
	} finally {
	  setLoading(false);
	}
  };

  return (
	<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
	  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
		<div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
		  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
			Reset Your Password
		  </h2>
		  <button
			onClick={onClose}
			className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
		  >
			<X size={24} />
		  </button>
		</div>

		<div className="p-6">
		  {error && (
			<div className="mb-4 p-2 bg-red-50 text-red-500 text-sm rounded">
			  {error}
			</div>
		  )}
		  
		  <form className="space-y-4" onSubmit={handleResetPassword}>
			<div>
			  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
				New Password
			  </label>
			  <input
				id="newPassword"
				name="newPassword"
				type="password"
				autoComplete="new-password"
				required
				value={newPassword}
				onChange={(e) => setNewPassword(e.target.value)}
				className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
			  />
			</div>

			<div>
			  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
				Confirm Password
			  </label>
			  <input
				id="confirmPassword"
				name="confirmPassword"
				type="password"
				autoComplete="new-password"
				required
				value={confirmPassword}
				onChange={(e) => setConfirmPassword(e.target.value)}
				className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
			  />
			</div>

			<div className="flex justify-end">
			  <button
				type="submit"
				disabled={loading}
				className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
			  >
				{loading ? 'Resetting...' : 'Reset Password'}
			  </button>
			</div>
		  </form>
		</div>
	  </div>
	</div>
  );
}
