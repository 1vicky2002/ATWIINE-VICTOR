import React from 'react';
import { motion } from 'motion/react';
import { Shield, Target, Award, CheckCircle2, Heart } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { ProfileIcon } from '../components/CustomIcons';

export default function About() {
  const stats = [
    { label: "Verified Ballots", value: "100%", icon: Shield },
    { label: "Public Projects", value: "50+", icon: Target },
    { label: "Active Voters", value: "250K+", icon: ProfileIcon },
    { label: "Awards Won", value: "12", icon: Award }
  ];

  const values = [
    {
      title: "Transparency",
      description: "Every vote is recorded on a secure blockchain-inspired ledger, ensure immutable results that anyone can verify in real-time.",
      color: "bg-ug-yellow"
    },
    {
      title: "Inclusivity",
      description: "We believe democracy belongs to everyone. Our platform is designed to be accessible on all devices, even in low-bandwidth areas.",
      color: "bg-ug-red"
    },
    {
      title: "Security",
      description: "Using world-class encryption and multi-factor authentication, we protect the integrity of every single ballot cast.",
      color: "bg-slate-900"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <Helmet>
        <title>About Us | Uganda Votes - The Future of National Digital Democracy</title>
        <meta name="description" content="Learn about Uganda Votes, the leading platform for digital polling and public opinion tracking across Uganda. Our mission, values, and impact." />
      </Helmet>

      {/* Hero Section */}
      <section className="text-center mb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-ug-red/5 rounded-full text-ug-red text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
        >
          <Heart size={14} fill="currentColor" />
          Our Mission
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-display font-black tracking-tighter text-slate-900 mb-8 leading-none"
        >
          Empowering Every <br />
          <span className="text-ug-red italic">Ugandan Voice</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed"
        >
          Uganda Votes is a non-partisan digital initiative dedicated to bridging the gap between public opinion and national decision-making through secure, transparent polling across the country.
        </motion.p>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center group hover:shadow-xl transition-all"
          >
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-ug-red group-hover:text-white transition-colors">
              <stat.icon size={24} />
            </div>
            <div className="text-3xl font-display font-black text-slate-900 mb-1">{stat.value}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Story Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-32">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative rounded-[48px] overflow-hidden aspect-square shadow-2xl"
        >
          <img 
            src="https://images.unsplash.com/photo-1531266752426-aad472b7bdf4?auto=format&fit=crop&q=80&w=1000" 
            alt="Impact" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ug-red/40 to-transparent" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="text-4xl font-display font-bold tracking-tighter text-slate-900 leading-tight">
            Built for the People, <br />
            <span className="text-ug-red">By the People.</span>
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Founded in 2024, Uganda Votes emerged from a need for a reliable, neutral platform where citizens across the country could express their preferences on everything from local community projects to national leadership and development initiatives.
          </p>
          <div className="space-y-4">
            {["International Standard Security", "Real-time Verification", "Non-partisan Engagement"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-900 font-bold text-sm">
                <CheckCircle2 size={18} className="text-ug-red" />
                {item}
              </div>
            ))}
          </div>
          <button 
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-ug-red transition-all"
          >
            Read Our Whitepaper
          </button>
        </motion.div>
      </section>

      {/* Values */}
      <section className="mb-32">
        <h2 className="text-3xl font-display font-bold text-center mb-16 italic">Our Core Principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="p-10 rounded-2xl border border-slate-100 bg-white relative group"
            >
              <div className={`w-3 h-3 rounded-full ${value.color} absolute top-10 right-10`} />
              <h3 className="text-2xl font-display font-bold text-slate-900 mb-6">{value.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 rounded-[48px] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-5 text-white">
          <Target size={200} />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-8 tracking-tighter">
            Ready to make your <br />
            <span className="text-ug-yellow italic">Voice Count?</span>
          </h2>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <button className="px-10 py-5 bg-ug-yellow text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-105 transition-all">Get Started Today</button>
            <button className="px-10 py-5 bg-white/10 text-white border border-white/20 rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-white/20 transition-all">Contact Our Office</button>
          </div>
        </div>
      </section>
    </div>
  );
}
