'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface WendlerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WendlerGuideModal: React.FC<WendlerGuideModalProps> = ({ isOpen, onClose }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['what', 'cycle']));

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const sections = [
    {
      id: 'what',
      title: 'What is 5/3/1?',
      content: 'A strength training program that uses submaximal weights with progressive overload. Focuses on building strength over time rather than maxing out every session.'
    },
    {
      id: 'cycle',
      title: 'Cycle Structure',
      content: 'Each cycle is 7 weeks: 3 weeks of main work, 3 weeks of supplemental work, and 1 deload week. After deload, start a new cycle with increased Training Max.'
    },
    {
      id: 'tm',
      title: 'Training Max (TM)',
      content: 'Uses 90% of your true 1RM as the starting point. This conservative approach ensures you can complete all reps with good form and allows for long-term progress without burnout.'
    },
    {
      id: 'flow',
      title: 'Weekly Flow',
      content: 'Warm-up sets → Main working sets → PR set (as many reps as possible, marked with "x+") → Optional Joker sets if you feel strong. Always prioritize form over weight.'
    },
    {
      id: 'pr-joker',
      title: 'PR & Joker Rules',
      content: 'Stop the PR set around RPE 9 (one rep in reserve). Skip Joker sets if you feel fatigued or form breaks down. These are optional intensity boosters, not mandatory.'
    },
    {
      id: 'supplemental',
      title: 'Supplemental Work',
      content: 'Choose ONE approach: FSL (First Set Last - repeat first working set), SSL (Second Set Last), or BBB (Boring But Big - 5x10 at lighter weight). Don\'t mix programs.'
    },
    {
      id: 'who',
      title: 'Who It\'s For / Not For',
      content: 'Best for intermediate to advanced lifters who want steady, sustainable strength gains. Not ideal for complete beginners or those who need constant variety or high-frequency training.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white pb-4 border-b border-slate-100">
          <h3 className="text-xl font-black text-slate-800">Wendler 5/3/1 가이드</h3>
          <button 
            onClick={onClose}
            className="bg-slate-50 p-2.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {sections.map(section => {
            const isOpen = openSections.has(section.id);
            return (
              <div key={section.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-sm font-black text-slate-800 text-left">{section.title}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 bg-white">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
