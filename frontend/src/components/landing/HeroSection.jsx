import React from "react";
import { motion } from "framer-motion";
import { Check, Clock, Users, Shield, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";

const features = [
  { icon: Check, text: "Invoice 10x faster" },
  { icon: Clock, text: "Auto warranty tracking" },
  { icon: Users, text: "Customer history in 1 click" },
  { icon: Shield, text: "No manual register" },
  { icon: AlertCircle, text: "Auto expiry alerts" },
];

function HeroSection({ openContactForm }) {
  return (
    <section className="relative overflow-hidden py-8 bg-gradient-to-b from-blue-50/60 to-white">
      {/* Glow */}
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-200/30 blur-3xl rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT CONTENT */}
        <div>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white border border-blue-100 rounded-full text-sm font-semibold text-blue-700 shadow-sm"
          >
            🚀 Register Band, Search Shuru
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold leading-tight mb-5"
          >
            Warranty Check <span className="text-blue-600">2 Second Mein</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg text-gray-600 mb-8 max-w-lg"
          >
            Battery aur inverter shops ke liye smart software — billing,
            warranty tracking aur customer history sab ek jagah.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <Button
              size="lg"
              className="bg-blue-600 text-white rounded-full px-8 shadow-lg hover:bg-blue-700"
              onClick={() => openContactForm("demo")}
            >
              🚀 Book Free Demo
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-2 border-blue-600 text-blue-600 rounded-full px-8 hover:bg-blue-50"
              onClick={() => openContactForm("trial")}
            >
              Start Free Trial
            </Button>
          </motion.div>

          {/* Trust */}
          <p className="text-sm font-medium text-gray-700 mb-6 bg-yellow-50 inline-block px-3 py-1 rounded-md border border-yellow-200">
            ⭐ Ab live hai select shops mein — jaldi apna number lagwao
          </p>

          {/* Features */}
          <div className="flex flex-wrap gap-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-full text-sm shadow-sm"
                >
                  <Icon size={16} className="text-blue-600" />
                  {f.text}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE (Dashboard Preview) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-5">
            {/* Realistic Dashboard Mockup */}
            <div className="space-y-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-bold text-gray-900">Dashboard</div>
                <div className="text-xs bg-gray-100 border border-gray-200 rounded-full flex items-center justify-between px-3 py-1 font-medium text-gray-600">
                  Today
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mb-1">Key Metrics</div>
              
              {/* Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Revenue */}
                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="text-blue-500 font-bold text-xs">₹</span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Total Revenue</div>
                  </div>
                  <div className="text-xl font-bold text-slate-800 mb-1">₹42,500</div>
                  <div className="text-[10px] text-green-500 font-medium">+12% vs last month</div>
                </div>
                {/* Invoices */}
                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Invoices</div>
                  </div>
                  <div className="text-xl font-bold text-slate-800 mb-1">24</div>
                  <div className="text-[10px] text-gray-500 font-medium">18 paid, 6 unpaid</div>
                </div>
              </div>

              {/* Alerts Panel Mock */}
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={14} className="text-orange-500" />
                  <div className="text-xs font-bold text-gray-700">Alerts & Notifications</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-orange-50/50 p-2 rounded-lg border border-orange-100/50">
                     <div className="w-1 h-6 bg-orange-400 rounded-full"></div>
                     <div className="flex-1">
                       <div className="text-xs font-semibold text-gray-800">5 invoices overdue</div>
                       <div className="text-[10px] text-gray-500">Need follow-up today</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 bg-red-50/50 p-2 rounded-lg border border-red-100/50">
                     <div className="w-1 h-6 bg-red-400 rounded-full"></div>
                     <div className="flex-1">
                       <div className="text-xs font-semibold text-gray-800">3 service visits missed</div>
                       <div className="text-[10px] text-gray-500">Reschedule immediately</div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Card */}
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white p-3 sm:p-4 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <Clock size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Warranty Expiring</p>
              <p className="font-semibold text-xs sm:text-sm text-slate-800">Rajesh - 2 days left</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
