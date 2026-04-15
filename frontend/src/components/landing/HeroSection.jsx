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
            🚀 Register Bandh, Search Shuru
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold leading-tight mb-5"
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
              🚀 Free Demo
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
          <p className="text-sm text-gray-500 mb-6">
            Trusted by 500+ shop owners across India
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
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
            {/* Fake Dashboard UI */}
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-blue-50 rounded-xl" />
                <div className="h-24 bg-green-50 rounded-xl" />
              </div>
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>
          </div>

          {/* Floating Card */}
          <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-gray-200">
            <p className="text-xs text-gray-500">Warranty Expiring</p>
            <p className="font-semibold text-sm">Rajesh - 2 days left</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
