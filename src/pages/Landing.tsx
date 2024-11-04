import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, Calendar, Brain, Users, ChevronRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-gray-900">Matcha</span>
            </div>
            <div className="flex items-center gap-8">
              <Link to="/about" className="text-gray-600 hover:text-gray-900 transition-colors">About</Link>
              <Link to="/new" className="text-gray-600 hover:text-gray-900 transition-colors">New</Link>
              <Link to="/upcoming" className="text-gray-600 hover:text-gray-900 transition-colors">Upcoming</Link>
              <Link 
                to="/login"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6 animate-fade-in">
              Your AI Academic Assistant
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in">
              Navigate your academic journey with personalized guidance and support. Let Matcha help you achieve your educational goals.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors animate-fade-in"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Why Choose Matcha?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <Calendar className="h-12 w-12 text-emerald-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Smart Calendar
              </h3>
              <p className="text-gray-600">
                Seamlessly integrate with Google Calendar and manage your academic schedule efficiently.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <Brain className="h-12 w-12 text-emerald-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI-Powered Insights
              </h3>
              <p className="text-gray-600">
                Get personalized insights to optimize your study habits.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <Users className="h-12 w-12 text-emerald-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Personal UNCC Assistant
              </h3>
              <p className="text-gray-600">
                Receive advice and guidance from an AI trained on UNCC Context.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-white">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Excel in Your Studies?
              </h2>
              <p className="text-emerald-100 text-lg">
                Join thousands of students using Matcha to achieve their academic goals.
              </p>
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Get Started Now <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-emerald-600" />
              <span className="text-lg font-semibold text-gray-900">Matcha</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/about" className="text-gray-600 hover:text-gray-900 transition-colors">About</Link>
              <a 
                href="https://drive.google.com/file/d/1Ue2x7JxllZYec7HW4L3MjbaKfO9Hgsjf/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Privacy and Terms
              </a>
            </div>
            <p className="text-gray-600">
              © {new Date().getFullYear()} Matcha. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}