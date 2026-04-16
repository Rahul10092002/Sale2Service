import React from "react";
import {
  Zap,
  Users,
  Shield,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Card } from "../ui/Card";

function WhyChooseUs() {
  const benefits = [
    {
      icon: Zap,
      title: "Instant Search",
      desc: "2 sec mein result – no scrolling",
    },
    {
      icon: Users,
      title: "Use Anywhere",
      desc: "Mobile pe bhi smooth – no laptop needed",
    },
    {
      icon: Shield,
      title: "Cloud Safe",
      desc: "Data kabhi lost nahi hoga",
    },
    {
      icon: Clock,
      title: "Fast at Scale",
      desc: "5000+ records bhi lightning fast",
    },
    {
      icon: AlertCircle,
      title: "Built for You",
      desc: "Battery + inverter shops ke liye",
    },
    {
      icon: TrendingUp,
      title: "Auto Reminders",
      desc: "Expiry se pehle WhatsApp alert with your own brand name",
    },
  ];

  return (
    <section className="py-16 border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Kyun Choose Kare{" "}
            <span className="text-blue-600">WarrantyDesk?</span>
          </h2>
          <p className="text-gray-600 mt-3">
            Fast, reliable, aur shop owners ke liye specially built.
          </p>
        </div>

        {/* Highlight Card (Main USP) */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-8 text-center shadow-lg">
            <h3 className="text-2xl font-bold mb-2">
              Register se 100x better 🚀
            </h3>
            <p className="text-blue-100">
              Jo kaam 5 minute leta tha, ab 2 second mein.
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {benefits.map((item, idx) => (
            <Card
              key={idx}
              className="p-5 border border-gray-200 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="bg-blue-50 p-2 rounded-lg">
                  <item.icon className="text-blue-600" size={18} />
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyChooseUs;
