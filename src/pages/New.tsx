import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, Palette, BarChart2, GraduationCap } from 'lucide-react';

export default function New() {
  const newFeatures = [
    {
      title: "Custom Categories with Color!",
      description: "Personalized catagories that match your style and help you see your tasks",
      icon: Palette,
      date: "Released November 2024"
    },
    {
      title: "Time Analysis",
      description: "Calendar integrated time management display for the power user",
      icon: BarChart2,
      date: "Released October 2024"
    },
    {
      title: "Scholorship Hosting",
      description: "Detailed scholorship hosting to offer towards the students of Matcha",
      icon: GraduationCap,
      date: "Released November 2024"
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
              <Link to="/new" className="text-emerald-600">New</Link>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-6 animate-fade-in">
              What's New in Matcha
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in">
              Discover our latest features and improvements designed to enhance your academic journey.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {newFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <Icon className="h-12 w-12 text-emerald-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {feature.description}
                  </p>
                  <p className="text-sm text-emerald-600">
                    {feature.date}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Try These New Features Today
            </h2>
            <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
              Experience the latest improvements and take your academic success to the next level.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Get Started <ArrowRight className="h-5 w-5" />
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