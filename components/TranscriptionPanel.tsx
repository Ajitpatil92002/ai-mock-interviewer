
import React, { useEffect, useRef } from 'react';
import { TranscriptionItem } from '../types';

interface TranscriptionPanelProps {
  transcripts: TranscriptionItem[];
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ transcripts }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl h-[400px] flex flex-col overflow-hidden">
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 font-semibold text-slate-300 flex items-center justify-between">
        <span>Interview Logs</span>
        <i className="fas fa-file-lines text-slate-500"></i>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700"
      >
        {transcripts.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">
            Waiting for conversation to begin...
          </div>
        )}
        {transcripts.map((item, idx) => (
          <div 
            key={idx}
            className={`flex flex-col ${item.type === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`text-[10px] mb-1 px-1 font-bold uppercase tracking-wider ${item.type === 'user' ? 'text-blue-400' : 'text-emerald-400'}`}>
              {item.type === 'user' ? 'Candidate' : 'Interviewer'}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
              item.type === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
            }`}>
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptionPanel;
