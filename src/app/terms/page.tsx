import Link from "next/link";
import { ArrowRight, Scale, ShieldCheck, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-slate-800 relative isolate">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      {/* Navbar */}
      <nav className="w-full max-w-4xl mx-auto px-6 py-8 flex items-center justify-between relative z-10">
        <Link href="/get-started" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
          <ArrowRight className="w-4 h-4 rotate-180 transition-transform group-hover:-translate-x-1" /> 
          Back to Get Started
        </Link>
        <Link href="/" className="flex items-center gap-3 group">
          <img src="/logo.svg" alt="Perenne Logo" className="logo-img w-7 h-7 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] invert group-hover:scale-110 transition-transform" />
        </Link>
      </nav>

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-6 pt-12 pb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-xs font-semibold uppercase tracking-widest mb-6">
          <Scale className="w-3 h-3" />
          Legal Agreement
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-black text-white tracking-tight mb-4">Terms & Conditions</h1>
        <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
          Please read these terms carefully before accessing or using the Perenne platform. By using this application, you are formally agreeing to these conditions.
        </p>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl mx-auto px-6 pb-24 relative z-10">
        <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 p-8 md:p-12 rounded-3xl shadow-2xl">
          
          <div className="prose prose-invert prose-slate max-w-none space-y-10">
            <div className="flex gap-4 items-start bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <div className="mt-1 bg-slate-800 p-2 rounded-lg"><FileText className="w-5 h-5 text-slate-300" /></div>
              <p className="text-slate-300 text-sm leading-relaxed m-0">
                <strong className="text-white">Cius Unc</strong>, the fully and rightful owner of Perenne, hereby establishes this legally binding declaration of Terms and Conditions. By continuing to access or use the services provided by Perenne, you expressly acknowledge and irrevocably consent to be bound by the stipulations contained herein.
              </p>
            </div>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3 border-b border-slate-800 pb-2">
                <span className="text-slate-600 text-lg">01</span> Acceptance of Terms
              </h2>
              <p className="text-slate-400 text-sm leading-loose">
                These Terms and Conditions (hereinafter referred to as the "Terms", "Agreement", or "T&C") constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("User", "You", or "Your"), and Perenne LLC, operating under the exclusive ownership and directorship of Cius Unc ("Company", "We", "Us", or "Our"). This Agreement concerns your access to and use of the Perenne web application, as well as any other media form, media channel, mobile website, or mobile application related, linked, or otherwise connected thereto (collectively, the "Site"). You agree that by accessing the Site, you have read, understood, and agreed to be bound by all of these Terms and Conditions. <strong className="text-slate-200">IF YOU DO NOT AGREE WITH ALL OF THESE TERMS AND CONDITIONS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.</strong>
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3 border-b border-slate-800 pb-2">
                <span className="text-slate-600 text-lg">02</span> Intellectual Property Rights
              </h2>
              <p className="text-slate-400 text-sm leading-loose">
                Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws of the applicable jurisdictions, international copyright laws, and international conventions. The Content and the Marks are provided on the Site "AS IS" for your information and personal use only. Except as expressly provided in these Terms and Conditions, no part of the Site and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3 border-b border-slate-800 pb-2">
                <span className="text-slate-600 text-lg">03</span> User Representations
              </h2>
              <p className="text-slate-400 text-sm leading-loose">
                By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms and Conditions; (4) you are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Site; (5) you will not access the Site through automated or non-human means, whether through a bot, script, or otherwise; (6) you will not use the Site for any illegal or unauthorized purpose; and (7) your use of the Site will not violate any applicable law or regulation.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3 border-b border-slate-800 pb-2">
                <span className="text-slate-600 text-lg">04</span> Limitation of Liability
              </h2>
              <p className="text-slate-400 text-sm leading-loose uppercase tracking-wide opacity-80">
                In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the site, even if we have been advised of the possibility of such damages.
              </p>
            </section>

          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <Link href="/get-started">
            <button className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-slate-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              <ShieldCheck className="w-5 h-5" />
              I Understand, Return to Setup
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
