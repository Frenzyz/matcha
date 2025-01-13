import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Heart, Users, BookOpen } from 'lucide-react';

export default function About() {
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
              <Link to="/about" className="text-emerald-600">About</Link>
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
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Our Mission
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Empowering UNCC students with personalized AI guidance for academic success and career development.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center animate-slide-up hover-lift">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-emerald-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Student-Centric</h3>
              <p className="text-gray-600">
                Built by students, for students, with a deep understanding of campus life.
              </p>
            </div>
            <div className="text-center animate-slide-up hover-lift" style={{ animationDelay: '100ms' }}>
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-emerald-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">
                AI-powered assistance that adapts to your unique schedule.
              </p>
            </div>
            <div className="text-center animate-slide-up hover-lift" style={{ animationDelay: '200ms' }}>
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-emerald-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
              <p className="text-gray-600">
                Fostering connections and collaboration within the student community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="animate-slide-up">
                <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                <p className="text-gray-600 mb-4">
                  Matcha was born from a simple observation: college students needed a better way to manage their academic journey. As a student at UNCC, I experienced firsthand the challenges of balancing academics, career preparation, and campus life.
                </p>
                <p className="text-gray-600 mb-4">
                  What started as a personal project to solve these challenges has grown into a comprehensive platform that helps students navigate their college experience with confidence and clarity.
                </p>
                <p className="text-gray-600">
                  Today, Matcha continues to evolve with the needs of UNCC students, powered by cutting-edge AI technology and a deep commitment to student success.
                </p>
              </div>
              <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '200ms' }}>
                <div className="rounded-lg overflow-hidden shadow-lg mb-4 hover-lift transition-all">
                  <img 
                    src="https://iili.io/2xK6G2a.md.jpg" 
                    alt="Aadit Chetan" 
                    className="w-full h-auto"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Aadit Chetan</h3>
                <p className="text-gray-600">Founder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center animate-slide-up hover-lift">
              <div className="text-4xl font-bold text-emerald-600 mb-2">100+</div>
              <p className="text-gray-600">Active Students</p>
            </div>
            <div className="text-center animate-slide-up hover-lift" style={{ animationDelay: '100ms' }}>
              <div className="text-4xl font-bold text-emerald-600 mb-2">#1</div>
              <p className="text-gray-600">CLT Hack Submission</p>
            </div>
            <div className="text-center animate-slide-up hover-lift" style={{ animationDelay: '200ms' }}>
              <div className="text-4xl font-bold text-emerald-600 mb-2">100%</div>
              <p className="text-gray-600">Student Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Transform Your College Experience?
            </h2>
            <Link 
              to="/signup"
              className="inline-block bg-white text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-colors hover-lift"
            >
              Get Started Today
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
