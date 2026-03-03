'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

const AUDIT_STEPS = [
  'Connecting to server...',
  'Fetching page HTML & headers...',
  'Analyzing meta tags & Open Graph data...',
  'Checking heading structure & hierarchy...',
  'Scanning images, alt tags & formats...',
  'Evaluating internal & external links...',
  'Verifying SSL, HSTS & security headers...',
  'Testing mobile & responsive design...',
  'Detecting structured data & schemas...',
  'Measuring server response & TTFB...',
  'Analyzing render-blocking resources...',
  'Checking third-party script impact...',
  'Evaluating content quality & E-E-A-T...',
  'Checking robots.txt & sitemap.xml...',
  'Analyzing crawlability & indexation...',
  'Detecting site type & platform...',
  'Running ecommerce-specific checks...',
  'Checking keyword rankings...',
  'Auditing Google Business Profile...',
  'Generating AI executive summary...',
  'Calculating category scores...',
  'Compiling audit report...',
];

export default function Home() {
  const [form, setForm] = useState({ name: '', email: '', website: '', company: '', businessName: '', businessLocation: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'form' | 'loading' | 'error'>('form');
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const stepRef = useRef(0);
  const reportRef = useRef<{ id: string } | null>(null);
  const apiDoneRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!form.website.trim()) errs.website = 'Website URL is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setPhase('loading');
    setCurrentStep(0);
    stepRef.current = 0;
    reportRef.current = null;
    apiDoneRef.current = false;

    // Step through the progress at a steady pace
    // Once API is done, speed up to finish remaining steps
    const advanceSteps = () => {
      const interval = setInterval(() => {
        if (apiDoneRef.current) {
          // API done — fast-finish remaining steps then navigate
          clearInterval(interval);
          const finishSteps = () => {
            if (stepRef.current < AUDIT_STEPS.length - 1) {
              stepRef.current++;
              setCurrentStep(stepRef.current);
              setTimeout(finishSteps, 250);
            } else {
              // All done — navigate to report
              setTimeout(() => {
                if (reportRef.current) {
                  window.location.href = `/report/${reportRef.current.id}`;
                }
              }, 500);
            }
          };
          finishSteps();
          return;
        }

        // Normal pace — advance one step but stop 2 before the end
        if (stepRef.current < AUDIT_STEPS.length - 3) {
          stepRef.current++;
          setCurrentStep(stepRef.current);
        }
      }, 1800);

      return interval;
    };

    const interval = advanceSteps();

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        clearInterval(interval);
        const data = await res.json();
        throw new Error(data.error || 'Audit failed');
      }

      const report = await res.json();
      sessionStorage.setItem(`report-${report.id}`, JSON.stringify(report));

      // Signal that API is done — the interval will pick this up and fast-finish
      reportRef.current = report;
      apiDoneRef.current = true;
    } catch (err) {
      clearInterval(interval);
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('error');
    }
  };

  if (phase === 'loading') {
    const progress = Math.round(((currentStep + 1) / AUDIT_STEPS.length) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 md:p-10">
            <div className="flex flex-col items-center text-center">
              {/* Spinner */}
              <div className="w-12 h-12 border-3 border-[#ffd600] border-t-transparent rounded-full animate-spin mb-6" />

              {/* Current step text */}
              <h2 className="text-lg font-semibold text-white mb-1">Analyzing your website</h2>
              <p className="text-sm text-[#a1a1aa] mb-2 font-mono">{form.website}</p>

              <motion.p
                key={currentStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-[#fafafa] font-medium mb-1"
              >
                {AUDIT_STEPS[currentStep]}
              </motion.p>

              <p className="text-xs text-[#71717a] mb-6">Step {currentStep + 1} of {AUDIT_STEPS.length}</p>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#ffd600] to-[#ffe033] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-[#71717a] mt-2">{progress}%</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 md:p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Audit Failed</h2>
            <p className="text-sm text-[#a1a1aa] mb-6">{errorMessage}</p>
            <button onClick={() => setPhase('form')} className="px-6 py-2.5 bg-[#ffd600] hover:bg-[#ffe033] text-black rounded-xl font-medium transition-colors">
              Try Again
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-lg">
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Free Website Audit</h1>
          <p className="text-sm text-[#a1a1aa] mb-1">Get a comprehensive report of your website&apos;s SEO health</p>
          <p className="text-xs text-[#71717a] mb-6">60+ checks across 12 categories — results in ~20 seconds</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" className="w-full px-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl text-white placeholder:text-[#71717a] focus:outline-none focus:border-[#ffd600] focus:ring-2 focus:ring-[#ffd600]/20 transition-colors" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" className="w-full px-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl text-white placeholder:text-[#71717a] focus:outline-none focus:border-[#ffd600] focus:ring-2 focus:ring-[#ffd600]/20 transition-colors" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Website URL</label>
              <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" className="w-full px-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl text-white placeholder:text-[#71717a] font-mono text-sm focus:outline-none focus:border-[#ffd600] focus:ring-2 focus:ring-[#ffd600]/20 transition-colors" />
              {errors.website && <p className="text-red-400 text-xs mt-1">{errors.website}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Company <span className="text-[#71717a]">(optional)</span></label>
              <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." className="w-full px-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl text-white placeholder:text-[#71717a] focus:outline-none focus:border-[#ffd600] focus:ring-2 focus:ring-[#ffd600]/20 transition-colors" />
            </div>
            <div className="border-t border-[#27272a] pt-4 mt-2">
              <p className="text-xs text-[#71717a] mb-3">Optional — helps us find your Google Business listing</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Business Name <span className="text-[#71717a]">(optional)</span></label>
                  <input type="text" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="e.g. Joe's Coffee Shop" className="w-full px-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl text-white placeholder:text-[#71717a] text-sm focus:outline-none focus:border-[#ffd600] focus:ring-2 focus:ring-[#ffd600]/20 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">City <span className="text-[#71717a]">(optional)</span></label>
                  <select value={form.businessLocation} onChange={(e) => setForm({ ...form, businessLocation: e.target.value })} className="w-full px-4 py-3 bg-[#09090b] border border-[#27272a] rounded-xl text-white text-sm focus:outline-none focus:border-[#ffd600] focus:ring-2 focus:ring-[#ffd600]/20 transition-colors">
                    <option value="">Select city...</option>
                    <option value="1000286">Sydney</option>
                    <option value="1000567">Melbourne</option>
                    <option value="1000339">Brisbane</option>
                    <option value="1000676">Perth</option>
                    <option value="1000422">Adelaide</option>
                    <option value="1000665">Gold Coast</option>
                    <option value="9053248">Sunshine Coast</option>
                    <option value="1000142">Canberra</option>
                    <option value="1000255">Newcastle</option>
                    <option value="1000594">Central Coast</option>
                    <option value="1000314">Wollongong</option>
                    <option value="1000537">Geelong</option>
                    <option value="1000414">Townsville</option>
                    <option value="1000347">Cairns</option>
                    <option value="1000322">Darwin</option>
                    <option value="1000480">Hobart</option>
                    <option value="1000481">Launceston</option>
                    <option value="1000412">Toowoomba</option>
                    <option value="1000492">Ballarat</option>
                    <option value="1000498">Bendigo</option>
                  </select>
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-3.5 bg-[#ffd600] hover:bg-[#ffe033] text-black font-bold rounded-xl text-base transition-all mt-2 hover:shadow-lg hover:shadow-[#ffd600]/20">
              Analyze My Website
            </button>
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-[#71717a]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs">Data secured</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#71717a]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs">Results in ~20 sec</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#71717a]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-xs">No credit card</span>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
