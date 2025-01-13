import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, Calendar, Clock, Zap } from 'lucide-react';

export default function Upcoming() {
  const upcomingFeatures = [
    {
      title: "Smart Calendar Assistant",
      description: "AI-powered calendar management and event suggestions",
      releaseDate: "Out Now! (BETA)",
      progress: 100
    },
    {
      title: "Group Planning Spaces",
      description: "Plan out events with classmates in virtual planning rooms",
      releaseDate: "Coming June 2024",
      progress: 40
    },
    {
      title: "Smart Budgeting",
      description: "The smart and simple budgeting tool for all students",
      releaseDate: "Coming April 2024",
      progress: 20
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-gray-900">Matcha</span>
            </Link>
            <div className="flex items-center gap-8">
              <Link to="/about" className="text-gray-600 hover:text-gray-900 transition-colors">About</Link>
              <Link to="/new" className="text-gray-600 hover:text-gray-900 transition-colors">New</Link>
              <Link to="/upcoming" className="text-emerald-600">Upcoming</Link>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-6 animate-fade-in">
              Coming Soon to Matcha
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in">
              Get a sneak peek at the exciting features we're working on to make your academic journey even better.
            </p>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {upcomingFeatures.map((feature, index) => (
              <div 
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <Calendar className="h-8 w-8 text-emerald-600" />
                  <span className="text-sm text-emerald-600 font-medium">
                    {feature.releaseDate}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {feature.description}
                </p>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-emerald-600 bg-emerald-200">
                        Progress
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-emerald-600">
                        {feature.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-emerald-200">
                    <div 
                      style={{ width: `${feature.progress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Development Timeline
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-emerald-200"></div>
              <div className="space-y-12">
                {upcomingFeatures.map((feature, index) => (
                  <div 
                    key={feature.title}
                    className="relative flex items-center justify-between"
                  >
                    <div className="w-5/12 pr-8 text-right">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {feature.releaseDate}
                      </p>
                    </div>
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div className="w-5/12 pl-8">
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Early Access Section */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Zap className="h-12 w-12 text-white mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-6">
              Want Early Access?
            </h2>
            <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
              Sign up now and be among the first to try our new features as they roll out.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Join the Beta <ArrowRight className="h-5 w-5" />
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
