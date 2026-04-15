import React from 'react';
import { Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

function PricingSection({ openContactForm }) {
  const plans = [
    {
      name: "Free Trial",
      price: "Free",
      period: "14 din",
      highlight: false,
      features: ["Full features unlock", "No credit card required", "Full access to all tools"]
    },
    {
      name: "Basic Plan",
      price: "₹999",
      period: "per year",
      highlight: true,
      features: ["Unlimited invoices", "500 customers", "Basic warranty tracking", "Email support"]
    },
    {
      name: "Pro Plan",
      price: "₹1999",
      period: "per year",
      highlight: false,
      features: ["Unlimited customers", "WhatsApp reminders", "Multi-user access", "Priority support", "Advanced analytics"]
    }
  ];

  return (
    <section id="pricing" className="py-20 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
          Kitna time aur paisa bacha sakte ho register hata kar?
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Ek register maintain karne mein roz 15-30 minute waste. Ek saal mein 100+ ghante sirf scroll karne mein. WarrantyDesk woh 100 ghante aapko business growth mein dega.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <Card
              key={idx}
              className={`p-8 border-2 transition ${plan.highlight
                ? 'border-blue-600 shadow-lg scale-105 bg-gradient-to-b from-blue-50 to-white'
                : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.highlight && (
                <div className="inline-block mb-4 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600 text-sm ml-2">{plan.period}</span>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex gap-3 text-gray-600">
                    <Check className="text-green-500 flex-shrink-0" size={20} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full rounded-full"
                variant={plan.highlight ? 'default' : 'outline'}
                onClick={() => openContactForm(plan.name.toLowerCase())}
              >
                Get Started
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
