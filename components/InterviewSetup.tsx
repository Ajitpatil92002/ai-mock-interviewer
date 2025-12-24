
import React, { useState } from 'react';
import { InterviewConfig } from '../types';

interface InterviewSetupProps {
  onStart: (config: InterviewConfig) => void;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ onStart }) => {
  const [role, setRole] = useState('Senior Frontend Engineer');
  const [company, setCompany] = useState('Google');
  const [experience, setExperience] = useState('5 years');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({ role, company, experience });
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 text-emerald-400">Mock Interview Setup</h2>
      <p className="text-slate-400 mb-8">Set your parameters and prepare to face the AI Interviewer.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Job Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
            placeholder="e.g. Senior Frontend Engineer"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Company Target</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
            placeholder="e.g. Google"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Experience Level</label>
          <input
            type="text"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
            placeholder="e.g. 5 years"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20"
        >
          <i className="fas fa-play"></i>
          Start Interview Session
        </button>
      </form>
    </div>
  );
};

export default InterviewSetup;
