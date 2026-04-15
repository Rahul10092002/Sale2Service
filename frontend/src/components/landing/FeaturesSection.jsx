import React from 'react';

function FeaturesSection() {
  const features = [
    {
      icon: '📄',
      title: 'Smart Invoice Generator',
      subtitle: 'No need to write in register',
      points: [
        'Fast billing – customer details ek baar save, baar baar use karo',
        'GST ready invoices – automatically serial number, date, warranty period print',
        'Print / PDF download – share on WhatsApp instantly',
        'Register mein copy karne ki zaroorat nahi – sab automatic store',
      ],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '⏰',
      title: 'Warranty Tracking System',
      subtitle: 'Auto-scroll khatam',
      points: [
        'Jab invoice generate hoga, warranty start & end date auto calculate',
        'Expiry alerts – software batayega "3 din mein warranty khatam"',
        'Easy claim tracking – register scroll kiye bina pata chalega warranty valid hai ya nahi',
        'Serial number se bhi search – agar customer phone number bhool gaya',
      ],
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: '👥',
      title: 'Customer Management',
      subtitle: 'Register band, search on',
      points: [
        'Complete purchase history – kab, kya, kitne warranty ke saath',
        'Phone number se instant search – jaise Google search, waise hi',
        'Repeat customers handle easily – purani warranty dekh kar upsell ya service offer',
        'Register mein multiple entries dhundhne ki takleef khatam',
      ],
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: '🔋',
      title: 'Product & Battery Records',
      subtitle: 'No more flipping pages',
      points: [
        'Serial number tracking – har battery/inverter ka unique ID',
        'Brand-wise management – Exide, Luminous, Microtek etc. alag se filter',
        'Warranty status clear – remaining days, claim count, service history',
        'Register ki jagah dashboard – ek hi click mein sab brand ka data',
      ],
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <section className="py-20 bg-surface-bg dark:bg-dark-bg">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-primary-light text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
            FEATURES
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-ink-base dark:text-white mb-4">
            Sab Kuch Ek Jagah –{' '}
            <span className="text-primary">Register Ki Zaroorat Nahi</span>
          </h2>
          <p className="text-ink-secondary dark:text-ink-muted max-w-2xl mx-auto text-lg">
            Har feature aapko register se azaadi dilata hai. Fast, accurate, aur hamesha available.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-surface-card dark:bg-dark-card rounded-2xl shadow-glass overflow-hidden border border-gray-100 dark:border-dark-border hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2"
              style={{ animation: `slideIn 0.4s ease-out ${index * 0.15}s both` }}
            >
              {/* Feature Header */}
              <div className={`gradient-${feature.color} p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{feature.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold">{feature.title}</h3>
                    <p className="text-white/80 text-sm">{feature.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Feature Points */}
              <div className="p-6">
                <ul className="space-y-3">
                  {feature.points.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-success flex-shrink-0 mt-0.5">✓</span>
                      <span className="text-ink-secondary dark:text-ink-muted text-sm">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
