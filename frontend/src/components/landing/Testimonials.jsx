import React from "react";
import { Card } from "../ui/Card";

function Testimonials() {
  const testimonials = [
    {
      quote:
        "Pehle customer aata tha toh 4-5 minute register dhundna padta tha. Kabhi milta hi nahi tha entry. Ab bas phone number daalo – 2 second mein pura record aa jaata hai.",
      highlight: "Ab search 2 second mein ho jaata hai",
      author: "Rajesh",
      company: "Battery Shop",
    },
    {
      quote:
        "Warranty khatam ho gayi ya nahi – yaad hi nahi rehta tha. Ab software khud bata deta hai. Customer ko call karke service de deta hoon.",
      highlight: "Ab customer ko main yaad dilata hoon",
      author: "Sunil",
      company: "Inverter Shop",
    },
    {
      quote:
        "Pehle claim pe jhagde hote the – 'likha nahi hai register mein'. Ab invoice mein sab clear hai – date, warranty, product. Sab proof hai.",
      highlight: "Ab koi jhagda nahi hota",
      author: "Anil",
      company: "Electronics Store",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Shop Owners Kya Bol Rahe Hai
          </h2>
          <p className="text-gray-600 mt-3">
            Real problems. Real solutions. Real impact.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card
              key={i}
              className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl transition"
            >
              {/* Quote */}
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                "{t.quote}"
              </p>

              {/* Highlight */}
              <p className="text-blue-600 font-semibold text-sm mb-4">
                ✔ {t.highlight}
              </p>

              {/* Author */}
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {t.author}
                </p>
                <p className="text-xs text-gray-500">{t.company}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-blue-50 border border-blue-200 px-6 py-4 rounded-xl">
            <p className="text-sm text-gray-700">
              <span className="font-bold text-gray-900">
                10+ shops already using WarrantyDesk with 1000+ customers registered
              </span>
              <br />
              Ek baar use karo → register wapas nahi khulega
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
