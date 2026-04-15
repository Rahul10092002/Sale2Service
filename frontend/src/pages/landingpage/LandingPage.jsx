import React, { useState } from 'react';
import {
  HeroSection,
  ProblemSection,
  SolutionSection,
  HowItWorks,
  WhyChooseUs,
  Testimonials,
  PricingSection,
  FinalCTA,
  Footer,
  ContactFormModal,
} from '../../components/landing';
import { Menu, X } from 'lucide-react';

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactType, setContactType] = useState('demo');

  const openContactForm = (type) => {
    setContactType(type);
    setContactModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 3l7 4v5c0 5-3.5 9-7 9s-7-4-7-9V7l7-4z"
                  />
                </svg>
              </div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">
                WarrantyDesk
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {/* Links */}
              <a
                href="#features"
                className="relative text-gray-600 hover:text-blue-600 transition group"
              >
                Features
                <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
              </a>

              <a
                href="#how-it-works"
                className="relative text-gray-600 hover:text-blue-600 transition group"
              >
                How It Works
                <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
              </a>

              <a
                href="#testimonials"
                className="relative text-gray-600 hover:text-blue-600 transition group"
              >
                Testimonials
                <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
              </a>

              {/* Login Button (Highlight) */}
              <a
                href="/login"
                className="ml-2 px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-700 hover:shadow-lg transition"
              >
                Login
              </a>
            </div>

            {/* Mobile Button */}
            <button
              className="md:hidden text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pb-4 space-y-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3">
              <a
                className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                href="#features"
              >
                Features
              </a>
              <a
                className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                href="#how-it-works"
              >
                How It Works
              </a>
              <a
                className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                href="#testimonials"
              >
                Testimonials
              </a>

              {/* Mobile Login CTA */}
              <a
                href="/login"
                className="block text-center mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
              >
                Login
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <HeroSection openContactForm={openContactForm} />
        <ProblemSection />
        <SolutionSection />
        <HowItWorks />
        <WhyChooseUs />
        <Testimonials />
        {/* <PricingSection openContactForm={openContactForm} /> */}
        <FinalCTA openContactForm={openContactForm} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactType={contactType}
      />
    </div>
  );
}

export default LandingPage;
