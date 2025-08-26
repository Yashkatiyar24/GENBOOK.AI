import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Star, Quote, ChevronDown, Zap, Shield, ArrowRight } from 'lucide-react';

// Pricing consistent with BillingView
const PRICES = {
  free: 0,
  professional: 29,
  enterprise: 99,
};

// Simple hook to animate elements when they enter the viewport
function useInViewAnimate<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      });
    }, { root: null, threshold: 0.15, ...(options || {}) });

    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);

  return { ref, visible } as const;
}

const Section: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <section className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className || ''}`}>{children}</section>
);

interface PricingPageProps {
  onGetStarted?: () => void;
  onSupport?: () => void;
  onContact?: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onGetStarted, onSupport, onContact }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const annualMultiplier = 10; // charge 10 months for 12 months (approx 2 free months)

  const priceFor = (base: number) => billingCycle === 'monthly' ? base : base * annualMultiplier;

  const plans = [
    {
      key: 'free',
      name: 'Free',
      price: PRICES.free,
      popular: false,
      gradient: 'from-slate-700/30 to-slate-800/30',
      cta: 'Start Free',
      features: [
        'Basic scheduling',
        'Email reminders',
        '1 team member',
        'Community support',
      ],
    },
    {
      key: 'professional',
      name: 'Professional',
      price: PRICES.professional,
      popular: true,
      gradient: 'from-cyan-500/15 to-blue-500/15',
      cta: 'Upgrade to Professional',
      features: [
        'Unlimited appointments',
        'Advanced chatbot (1000 messages/mo)',
        'Team collaboration (up to 5 users)',
        'Custom branding',
        'Priority support',
      ],
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: PRICES.enterprise,
      popular: false,
      gradient: 'from-purple-500/15 to-pink-500/15',
      cta: 'Contact Sales',
      features: [
        'Everything in Professional',
        'Unlimited team members',
        'Advanced analytics',
        'API access',
        '24/7 phone support',
      ],
    },
  ] as const;

  const comparisonRows = [
    { label: 'Unlimited appointments', free: false, professional: true, enterprise: true },
    { label: 'Email reminders', free: true, professional: true, enterprise: true },
    { label: 'Advanced chatbot', free: false, professional: true, enterprise: true },
    { label: 'Team members', free: '1', professional: 'Up to 5', enterprise: 'Unlimited' },
    { label: 'Custom branding', free: false, professional: true, enterprise: true },
    { label: 'Priority support', free: false, professional: true, enterprise: true },
    { label: 'Advanced analytics', free: false, professional: false, enterprise: true },
    { label: 'API access', free: false, professional: false, enterprise: true },
  ];

  const testimonials = [
    {
      name: 'Lisa Smith',
      role: 'Clinic Owner',
      text: 'GenBook.AI streamlined our scheduling. The Pro plan is worth every penny.',
      stars: 5,
      avatar: 'https://i.pravatar.cc/80?img=5',
    },
    {
      name: 'Dr. John Doe',
      role: 'Cardiologist',
      text: 'Automations and reminders reduced no-shows by 40%.',
      stars: 5,
      avatar: 'https://i.pravatar.cc/80?img=12',
    },
    {
      name: 'Emily Johnson',
      role: 'Practice Manager',
      text: 'Setup was fast, and the team features are perfect for us.',
      stars: 4,
      avatar: 'https://i.pravatar.cc/80?img=32',
    },
  ];

  const faqs = [
    {
      q: 'Can I switch plans later?',
      a: 'Yes, you can upgrade or downgrade anytime from Billing. Changes apply to your next billing cycle.',
    },
    {
      q: 'Do you offer annual billing?',
      a: 'Yes. Annual billing offers a discount (pay ~10 months for a year). Toggle Monthly/Annual above the plans.',
    },
    {
      q: 'Is there a free trial?',
      a: 'New organizations may start with a trial depending on promotions. Check Billing for details.',
    },
    {
      q: 'How do I cancel?',
      a: 'You can cancel anytime from Billing. Your subscription remains active until the end of the period.',
    },
  ];

  // Animations per section
  const hero = useInViewAnimate<HTMLDivElement>();
  const pricing = useInViewAnimate<HTMLDivElement>();
  const compare = useInViewAnimate<HTMLDivElement>();
  const reviews = useInViewAnimate<HTMLDivElement>();
  const faq = useInViewAnimate<HTMLDivElement>();
  const cta = useInViewAnimate<HTMLDivElement>();

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#07090c] via-[#0b0f14] to-[#0b0f14] text-white">
      {/* Hero */}
      <Section>
        <div
          ref={hero.ref}
          className={`py-16 sm:py-24 text-center transition-all duration-700 ease-out ${hero.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs mb-4">
            <Zap className="h-3.5 w-3.5" /> Flexible Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Plans built for every team
          </h1>
          <p className="mt-4 text-gray-300 max-w-2xl mx-auto">
            Transparent pricing that scales with you. Upgrade anytime from Billing.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/5 p-1 border border-white/10">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${billingCycle === 'monthly' ? 'bg-cyan-500 text-black' : 'text-gray-300 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${billingCycle === 'annual' ? 'bg-cyan-500 text-black' : 'text-gray-300 hover:text-white'}`}
            >
              Annual
            </button>
          </div>
        </div>
      </Section>

      {/* Pricing Plans */}
      <Section>
        <div
          ref={pricing.ref}
          className={`grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3 pb-12 transition-all duration-700 ${pricing.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          {plans.map((p) => (
            <div key={p.key} className={`relative rounded-2xl p-6 border backdrop-blur-xl bg-gradient-to-br ${p.gradient} ${p.popular ? 'border-cyan-400/40 shadow-[0_0_40px_rgba(6,182,212,0.25)]' : 'border-white/10'}`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-cyan-500 text-black font-semibold shadow">
                  Most Popular
                </div>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <Shield className="h-5 w-5 text-cyan-300/80" />
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-extrabold">{p.price === 0 ? 'Free' : `₹${priceFor(p.price)}`}</span>
                {p.price !== 0 && (
                  <span className="text-gray-400 mb-1 text-sm">{billingCycle === 'monthly' ? '/month' : '/year'}</span>
                )}
              </div>
              <p className="text-gray-400 mt-1 text-sm">
                {p.key === 'professional' && 'For growing businesses'}
                {p.key === 'enterprise' && 'For large organizations'}
                {p.key === 'free' && 'Get started at no cost'}
              </p>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-200">
                    <CheckCircle2 className="h-4 w-4 text-green-400" /> {f}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-8 w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${p.popular ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'bg-white/10 hover:bg-white/15'}`}
                onClick={() => {
                  if (p.key === 'professional') {
                    // Deep link to Billing upgrade (same priceId names as BillingView buttons)
                    window.location.hash = '#/billing';
                  } else if (p.key === 'enterprise') {
                    window.location.href = 'mailto:sales@genbook.ai?subject=GenBook%20Enterprise%20Inquiry';
                  } else {
                    window.location.hash = '#/signup';
                  }
                }}
              >
                {p.cta} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Feature Comparison */}
      <Section>
        <div
          ref={compare.ref}
          className={`pb-16 transition-all duration-700 ${compare.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <h2 className="text-2xl font-bold mb-6">Feature Comparison</h2>
          <div className="overflow-x-auto border border-white/10 rounded-xl">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-4">Feature</th>
                  <th className="p-4">Free</th>
                  <th className="p-4">Professional</th>
                  <th className="p-4">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="hover:bg-white/5">
                    <td className="p-4 text-gray-200">{row.label}</td>
                    {(['free','professional','enterprise'] as const).map((col) => (
                      <td key={col} className="p-4">
                        {typeof (row as any)[col] === 'boolean' ? (
                          (row as any)[col] ? (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          ) : (
                            <span className="text-gray-500">—</span>
                          )
                        ) : (
                          <span className="text-gray-200">{(row as any)[col]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <Section>
        <div
          ref={reviews.ref}
          className={`pb-16 transition-all duration-700 ${reviews.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <h2 className="text-2xl font-bold mb-6">What our customers say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover" loading="lazy" decoding="async" />
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-yellow-400">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mt-3 text-sm leading-relaxed">
                  <Quote className="inline h-4 w-4 mr-1 opacity-60" /> {t.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div
          ref={faq.ref}
          className={`pb-16 transition-all duration-700 ${faq.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5">
            {faqs.map((f, idx) => (
              <AccordionItem key={idx} question={f.q} answer={f.a} />
            ))}
          </div>
        </div>
      </Section>

      {/* CTA Footer */}
      <footer className="border-t border-white/10 bg-gradient-to-t from-black/40 to-transparent">
        <Section>
          <div
            ref={cta.ref}
            className={`py-12 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-700 ${cta.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <div>
              <h3 className="text-xl font-semibold">Ready to get started?</h3>
              <p className="text-gray-400 mt-1">Join thousands of providers using GenBook.AI.</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onGetStarted}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-medium hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
              >
                Get Started
              </button>
              <button onClick={onSupport} className="text-gray-300 hover:text-white">Support</button>
              <button onClick={onContact} className="text-gray-300 hover:text-white">Contact</button>
            </div>
          </div>
        </Section>
      </footer>
    </div>
  );
};

const AccordionItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4 sm:p-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <span className="font-medium text-gray-200">{question}</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="text-sm text-gray-400 pt-2">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
