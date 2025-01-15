<<<<<<< HEAD

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import TimeAnalysis from './components/TimeAnalysis';
import Scholarships from './pages/Scholarships';
import GroupStudy from './pages/GroupStudy';
import { UserDataProvider } from './context/UserDataProvider';
import Landing from './pages/Landing';
import About from './pages/About';
import New from './pages/New';
import Upcoming from './pages/Upcoming';
import { useLinking } from './utils/linking';

function PrivateRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, loading } = useAuth();
	
	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
			</div>
		);
	}
	
	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	return (
		<UserDataProvider>
			<Layout>{children}</Layout>
		</UserDataProvider>
	);
}

function PublicRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated } = useAuth();
	
	if (isAuthenticated) {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}

function AppContent() {
	const { getInitialURL, subscribe } = useLinking();

	useEffect(() => {
		const unsubscribe = subscribe(() => {
			// No action needed here, the listener in useLinking handles the logic
		});
		return () => unsubscribe();
	}, [subscribe]);

	return (
		<BrowserRouter>
			<Routes>
				{/* Public Routes */}
				<Route path="/" element={
					<PublicRoute>
						<Landing />
					</PublicRoute>
				} />
				<Route path="/about" element={
					<PublicRoute>
						<About />
					</PublicRoute>
				} />
				<Route path="/new" element={
					<PublicRoute>
						<New />
					</PublicRoute>
				} />
				<Route path="/upcoming" element={
					<PublicRoute>
						<Upcoming />
					</PublicRoute>
				} />
				
				{/* Auth Routes */}
				<Route path="/login" element={
					<PublicRoute>
						<Login />
					</PublicRoute>
				} />
				<Route path="/signup" element={
					<PublicRoute>
						<Signup />
					</PublicRoute>
				} />

				{/* Protected Routes */}
				<Route path="/dashboard" element={
					<PrivateRoute>
						<Dashboard />
					</PrivateRoute>
				} />
				<Route path="/analysis" element={
					<PrivateRoute>
						<TimeAnalysis />
					</PrivateRoute>
				} />
				<Route path="/group-study" element={
					<PrivateRoute>
						<GroupStudy />
					</PrivateRoute>
				} />
				<Route path="/scholarships" element={
					<PrivateRoute>
						<Scholarships />
					</PrivateRoute>
				} />
				<Route path="/settings" element={
					<PrivateRoute>
						<Settings />
					</PrivateRoute>
				} />

				{/* Fallback */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default function App() {
	return (
		<AuthProvider>
			<ErrorBoundary>
				<AppContent />
			</ErrorBoundary>
		</AuthProvider>
	);
}
=======
import React, { useEffect } from 'react';
    import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
    import { AuthProvider, useAuth } from './context/AuthContext';
    import ErrorBoundary from './components/ErrorBoundary';
    import Layout from './components/Layout';
    import Login from './pages/Login';
    import Signup from './pages/Signup';
    import Dashboard from './pages/Dashboard';
    import Settings from './pages/Settings';
    import TimeAnalysis from './components/TimeAnalysis';
    import Scholarships from './pages/Scholarships';
    import GroupStudy from './pages/GroupStudy';
    import { UserDataProvider } from './context/UserDataProvider';
    import Landing from './pages/Landing';
    import About from './pages/About';
    import New from './pages/New';
    import Upcoming from './pages/Upcoming';
    import ResetPassword from './pages/ResetPassword';
    import { useLinking } from './utils/linking';

    function PrivateRoute({ children }: { children: React.ReactNode }) {
      const { isAuthenticated, loading } = useAuth();
      
      if (loading) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        );
      }
      
      if (!isAuthenticated) {
        return <Navigate to="/login" />;
      }

      return (
        <UserDataProvider>
          <Layout>{children}</Layout>
        </UserDataProvider>
      );
    }

    function PublicRoute({ children }: { children: React.ReactNode }) {
      const { isAuthenticated } = useAuth();
      
      if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
      }

      return <>{children}</>;
    }

    function AppContent() {
      const { getInitialURL, subscribe } = useLinking();

      useEffect(() => {
        const unsubscribe = subscribe(() => {
          // No action needed here, the listener in useLinking handles the logic
        });
        return () => unsubscribe();
      }, [subscribe]);

      return (
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            } />
            <Route path="/about" element={
              <PublicRoute>
                <About />
              </PublicRoute>
            } />
            <Route path="/new" element={
              <PublicRoute>
                <New />
              </PublicRoute>
            } />
            <Route path="/upcoming" element={
              <PublicRoute>
                <Upcoming />
              </PublicRoute>
            } />
            
            {/* Auth Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/signup" element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            } />
            <Route path="/reset-password" element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            } />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/analysis" element={
              <PrivateRoute>
                <TimeAnalysis />
              </PrivateRoute>
            } />
            <Route path="/group-study" element={
              <PrivateRoute>
                <GroupStudy />
              </PrivateRoute>
            } />
            <Route path="/scholarships" element={
              <PrivateRoute>
                <Scholarships />
              </PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      );
    }

    export default function App() {
      return (
        <AuthProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      );
    }
>>>>>>> 21382a5db80026095c5a59bdba1a1ad86c120a7a
