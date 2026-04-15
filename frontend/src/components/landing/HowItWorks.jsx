import React from "react";

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Customer add karo",
      desc: "Phone number se entry",
    },
    {
      step: "02",
      title: "Product select",
      desc: "Warranty auto attach",
    },
    {
      step: "03",
      title: "Invoice generate",
      desc: "PDF + cloud save",
    },
    {
      step: "04",
      title: "Instant lookup",
      desc: "2 sec mein full history",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-16 bg-gradient-to-b from-blue-50/60 to-white border-t border-gray-100"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Kaise Kaam Karta Hai?
          </h2>
          <p className="text-gray-600 mt-3">
            4 simple steps. Bas ek baar use karo, phir habit ban jaayega.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200"></div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {steps.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition"
              >
                {/* Step badge */}
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold mb-4">
                  {item.step}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final Impact CTA */}
        <div className="mt-14 text-center">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-5 rounded-2xl shadow-lg">
            <p className="text-lg font-semibold">
              Bas 1 baar use karo → Register hamesha ke liye band 📕❌
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
