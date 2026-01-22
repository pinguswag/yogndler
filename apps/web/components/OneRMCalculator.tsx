'use client';

import React, { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { LiftType } from '@/types';
import { LIFT_LABELS } from '@/constants';

interface OneRMCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (oneRM: number, liftType?: Exclude<LiftType, LiftType.WEAKNESS>) => void;
  targetLift?: Exclude<LiftType, LiftType.WEAKNESS> | null;
}

export const OneRMCalculator: React.FC<OneRMCalculatorProps> = ({ isOpen, onClose, onApply, targetLift = null }) => {
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [selectedLift, setSelectedLift] = useState<Exclude<LiftType, LiftType.WEAKNESS> | null>(targetLift);

  // Epley formula: 1RM = weight × (1 + reps / 30)
  const calculate1RM = (): number | null => {
    const w = parseFloat(weight);
    const r = parseFloat(reps);
    
    if (!w || !r || w <= 0 || r <= 0 || r > 30) {
      return null;
    }
    
    const oneRM = w * (1 + r / 30);
    // Round to nearest 0.5kg
    return Math.round(oneRM * 2) / 2;
  };

  const calculated1RM = calculate1RM();

  const handleApply = () => {
    if (calculated1RM !== null && selectedLift) {
      onApply(calculated1RM, selectedLift);
      setWeight('');
      setReps('');
      setSelectedLift(null);
      onClose();
    }
  };

  // Reset selected lift when targetLift prop changes
  useEffect(() => {
    if (targetLift) {
      setSelectedLift(targetLift);
    }
  }, [targetLift]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            1RM 계산기
          </h3>
          <button 
            onClick={onClose}
            className="bg-slate-50 p-2.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-wider">
              적용할 운동
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(LIFT_LABELS)
                .filter(([key]) => key !== LiftType.WEAKNESS)
                .map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedLift(key as Exclude<LiftType, LiftType.WEAKNESS>)}
                    className={`p-3 rounded-xl text-xs font-black transition-all ${
                      selectedLift === key
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-wider">
              들었던 무게 (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="예: 100"
              className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-lg font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-wider">
              반복 횟수
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="예: 5"
              min="1"
              max="30"
              className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-lg font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {calculated1RM !== null && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
              <p className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-wider">
                예상 1RM
              </p>
              <p className="text-3xl font-black text-blue-600">
                {calculated1RM}kg
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-sm uppercase rounded-2xl active:scale-95 transition-all"
            >
              취소
            </button>
            <button
              onClick={handleApply}
              disabled={calculated1RM === null || !selectedLift}
              className="flex-1 py-4 bg-blue-600 text-white font-black text-sm uppercase rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              적용하기
            </button>
          </div>

          <p className="text-[9px] text-slate-400 text-center leading-relaxed">
            Epley 공식 사용: 1RM = 무게 × (1 + 횟수 / 30)
          </p>
        </div>
      </div>
    </div>
  );
};
