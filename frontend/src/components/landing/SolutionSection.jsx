import React from "react";
import { Zap, Clock, Users, Shield, Check } from "lucide-react";
import { Card } from "../ui/Card";

function SolutionSection() {
  const features = [
    {
      icon: Zap,
      title: "Smart Billing",
      highlight: "No register needed",
      points: ["Save once, reuse anytime", "GST + PDF + WhatsApp ready"],
    },
    {
      icon: Clock,
      title: "Warranty Tracking",
      highlight: "No manual checking",
      points: ["Auto expiry alerts", "Search via phone / serial"],
    },
    {
      icon: Users,
      title: "Customer Records",
      highlight: "Instant search",
      points: ["Full purchase history", "Repeat customer = easy upsell"],
    },
    {
      icon: Shield,
      title: "Product Tracking",
      highlight: "Everything organized",
      points: ["Serial-wise tracking", "Warranty + service status"],
    },
  ];

  const comparisons = [
    {
      title: "Search Time",
      manual: "5 min scroll ❌",
      digital: "2 sec result ✅",
    },
    {
      title: "Reminders",
      manual: "Yaad rakhna ❌",
      digital: "Auto alert ✅",
    },
    {
      title: "Invoice Copy",
      manual: "Rewrite ❌",
      digital: "1 click ✅",
    },
    {
      title: "Data Safety",
      manual: "Damage risk ❌",
      digital: "Cloud safe ✅",
    },
  ];

  return (
    <section
      id="features"
      className="py-16 bg-gradient-to-b from-white to-gray-50"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Replace Register with{" "}
            <span className="text-blue-600">Smart System</span>
          </h2>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            Billing, warranty, customers — sab ek jagah. Fast, simple, secure.
          </p>
        </div>

        {/* Comparison Cards (New Pattern) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {comparisons.map((item, i) => (
            <div
              key={i}
              className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition"
            >
              <p className="text-sm text-gray-500 mb-2">{item.title}</p>
              <p className="text-red-500 text-sm">{item.manual}</p>
              <p className="text-green-600 font-semibold">{item.digital}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <Card
              key={i}
              className="p-6 border border-gray-200 hover:border-blue-400 hover:shadow-xl transition rounded-2xl"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="bg-blue-50 p-3 rounded-xl">
                  <f.icon className="text-blue-600" size={22} />
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {f.title}
                  </h3>
                  <p className="text-xs text-blue-600 font-medium mb-3">
                    {f.highlight}
                  </p>

                  <ul className="space-y-2">
                    {f.points.map((p, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <Check size={16} className="text-green-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SolutionSection;
