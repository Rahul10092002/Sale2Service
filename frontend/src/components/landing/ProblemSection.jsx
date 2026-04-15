import React from "react";
import {
  AlertCircle,
  Users,
  Clock,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";

function ProblemSection() {
  const problems = [
    {
      icon: AlertCircle,
      title: "Warranty card kho gaya?",
      desc: "Register khol → page dhundo → time waste",
    },
    {
      icon: Users,
      title: "Customer repeat aaya?",
      desc: "Old entry dhundhna = headache",
    },
    {
      icon: Clock,
      title: "1000+ entries?",
      desc: "Scroll karo… mistake pakki",
    },
    {
      icon: Shield,
      title: "Claim ke time panic?",
      desc: "Record nahi mila → customer upset",
    },
    {
      icon: TrendingUp,
      title: "Different brands warranty?",
      desc: "Sab mix ho jata hai",
    },
    {
      icon: Zap,
      title: "Register damage?",
      desc: "Pura data risk pe",
    },
  ];

  return (
    <section className="relative bg-gradient-to-b from-white to-gray-50 py-16">
      {/* subtle pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <h2 className="text-2xl md:text-4xl font-bold text-center text-gray-900 mb-4">
          Roz ka struggle hai?
        </h2>
        <p className="text-center text-gray-500 mb-10">
          Manual register = slow, risky, frustrating 😤
        </p>

        {/* Problems Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {problems.map((problem, idx) => (
            <div
              key={idx}
              className="group flex gap-3 p-4 rounded-xl border bg-white hover:bg-red-50 hover:border-red-200 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="p-2 rounded-lg bg-red-100 text-red-600 group-hover:scale-110 transition">
                <problem.icon size={18} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {problem.title}
                </h3>
                <p className="text-xs text-gray-500">{problem.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Highlight Strip */}
        <div className="mt-10 text-center">
          <div className="inline-block px-6 py-3 rounded-full bg-blue-600 text-white font-semibold shadow-lg">
            🚀 Register band. WarrantyDesk shuru.
          </div>
        </div>

        {/* Supporting Line */}
        <p className="text-center text-gray-500 mt-4 text-sm">
          Sab data safe, searchable & instant ⚡
        </p>
      </div>
    </section>
  );
}

export default ProblemSection;
