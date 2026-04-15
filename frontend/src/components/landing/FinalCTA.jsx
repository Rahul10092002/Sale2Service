import React from "react";
import { Button } from "../ui/Button";

function FinalCTA({ openContactForm }) {
  return (
    <section className="relative py-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white,_transparent_70%)]"></div>

      <div className="relative max-w-3xl mx-auto text-center px-4">
        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">
          Register Bandh. Business Smart. 🚀
        </h2>

        {/* Subtext */}
        <p className="text-lg md:text-xl opacity-90 mb-8 leading-relaxed">
          Pehle:{" "}
          <span className="opacity-80">
            "Sir ek minute register check karta hoon..."
          </span>
          <br />
          Ab:{" "}
          <span className="font-semibold">
            "Sir number batayein… 2 second mein sab mil gaya"
          </span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 rounded-full px-8 font-semibold shadow-lg"
            onClick={() => openContactForm("trial")}
          >
            🚀 Free Trial Start Karein
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-blue-600 rounded-full px-8 font-semibold"
            onClick={() => openContactForm("call")}
          >
            📞 Call Now – 8085035032
          </Button>
        </div>

        {/* Trust Line */}
        <p className="text-sm opacity-80">
          ✔ No setup cost &nbsp; • &nbsp; ✔ Easy to use &nbsp; • &nbsp; ✔ 1-day
          setup
        </p>
      </div>
    </section>
  );
}

export default FinalCTA;
