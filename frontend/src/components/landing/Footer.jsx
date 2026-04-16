import React from "react";
import { Phone, Mail, MapPin } from "lucide-react";

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-sm">
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
              <span className="font-bold text-white">WarrantyDesk</span>
            </div>
            <p className="text-sm">
              We kill manual registers for battery & inverter shops
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-white transition">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Support
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <Phone size={16} className="flex-shrink-0" /> +91 8085035032
              </li>
              <li className="flex gap-2">
                <Mail size={16} className="flex-shrink-0" />{" "}
                rahulpatidar2132@gmail.com
              </li>
              <li className="flex gap-2">
                <MapPin size={16} className="shrink-0" /> India
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} WarrantyDesk. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-4">
            <a href="#" className="hover:text-white transition">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#" className="hover:text-white transition">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
