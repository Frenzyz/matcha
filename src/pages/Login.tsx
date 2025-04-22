import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FloatingLeaves from '../components/FloatingLeaves';

export default function Login() {
	const navigate = useNavigate();
	const { login, forgotPassword } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [showForgotPassword, setShowForgotPassword] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			await login({ email, password });
			navigate('/dashboard', { replace: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to log in');
		} finally {
			setLoading(false);
		}
	};

	const handleForgotPassword = async () => {
		setError('');
		setLoading(true);
		try {
			await forgotPassword(email);
			setError('A password reset link has been sent to your email.');
			setShowForgotPassword(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send reset link');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
			<FloatingLeaves />
			<div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
				<div className="flex justify-center">
					<div className="rounded-full bg-emerald-100 p-3">
						<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-leaf text-emerald-600"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>
					</div>
				</div>
				<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
					Welcome to Matcha
				</h2>
				<p className="mt-2 text-center text-sm text-gray-600">
					Your AI-powered academic companion
				</p>
			</div>

			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
				<div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
					{error && (
						<div className="mb-4 p-2 bg-red-50 text-red-500 text-sm rounded">
							{error}
						</div>
					)}
					
					<form className="space-y-6" onSubmit={handleSubmit}>
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700">
								Email address
							</label>
							<div className="mt-1">
								<input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
									placeholder="Enter your email"
								/>
							</div>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700">
								Password
							</label>
							<div className="mt-1">
								<input
									id="password"
									name="password"
									type="password"
									autoComplete="current-password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
								/>
							</div>
						</div>

						<div className="flex justify-between items-center">
							<button
								type="submit"
								disabled={loading}
								className={`flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
									loading ? 'opacity-50 cursor-not-allowed' : ''
								}`}
							>
								{loading ? 'Signing in...' : 'Sign in'}
							</button>
							<button
								type="button"
								onClick={() => setShowForgotPassword(true)}
								className="text-sm text-gray-600 hover:text-gray-900"
							>
								Forgot password?
							</button>
						</div>
					</form>

					{showForgotPassword && (
						<div className="mt-4">
							<p className="text-sm text-gray-600 mb-2">
								Enter your email to receive a password reset link.
							</p>
							<div className="flex gap-2">
								<button
									onClick={handleForgotPassword}
									disabled={loading}
									className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? 'Sending...' : 'Send Reset Link'}
								</button>
								<button
									onClick={() => setShowForgotPassword(false)}
									className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
								>
									Cancel
								</button>
							</div>
						</div>
					)}

					<div className="mt-6">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-300" />
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-white text-gray-500">New to Matcha?</span>
							</div>
						</div>

						<div className="mt-6">
							<Link
								to="/signup"
								className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
							>
								Create an account
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
