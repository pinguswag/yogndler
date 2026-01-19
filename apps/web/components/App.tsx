'use client';

import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Dumbbell, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle,
  History as HistoryIcon,
  Info,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  PlusCircle,
  X,
  Clock,
} from 'lucide-react';
import { 
  LiftType, 
  WeekType, 
  AccessoryExercise,
  WorkoutHistory 
} from '@/types';
import { 
  LIFT_LABELS, 
  getSetsForWeek, 
  INITIAL_ACCESSORIES 
} from '@/constants';
import { 
  calculateTM, 
  calculateWeight, 
} from '@/utils/calculators';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/lib/supabase/client';

const App: React.FC = () => {
  const { settings, setSettings, loading } = useUserSettings();
  
  // localStorage에서 마지막 상태 복원
  const [activeTab, setActiveTab] = useState<'workout' | 'history' | 'settings'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wendler_last_tab');
      if (saved && ['workout', 'history', 'settings'].includes(saved)) {
        return saved as 'workout' | 'history' | 'settings';
      }
    }
    return 'workout';
  });
  
  // 탭 변경 시 localStorage에 저장
  const handleTabChange = (tab: 'workout' | 'history' | 'settings') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wendler_last_tab', tab);
    }
  };
  
  // localStorage에서 마지막 주차 복원
  const [activeWeek, setActiveWeek] = useState<WeekType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wendler_last_week');
      if (saved) {
        const week = parseInt(saved);
        if (week >= 1 && week <= 7) {
          return week as WeekType;
        }
      }
    }
    return 1;
  });
  
  // 주차 변경 시 localStorage에 저장
  const handleWeekChange = (week: WeekType) => {
    setActiveWeek(week);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wendler_last_week', week.toString());
    }
  };
  
  // localStorage에서 마지막 리프트 복원
  const [activeLift, setActiveLift] = useState<LiftType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wendler_last_lift');
      if (saved && Object.values(LiftType).includes(saved as LiftType)) {
        return saved as LiftType;
      }
    }
    return LiftType.SQUAT;
  });
  
  // 리프트 변경 시 localStorage에 저장
  const handleLiftChange = (lift: LiftType) => {
    setActiveLift(lift);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wendler_last_lift', lift);
    }
  };
  const [showAddAccessory, setShowAddAccessory] = useState(false);
  
  // Form state for new accessory
  const [newAcc, setNewAcc] = useState({ name: '', weight: 0, sets: 3, reps: '10' });

  // TM Calculation Logic based on user's specific progression rules
  const currentTMs = useMemo(() => {
    if (!settings) {
      return {
        [LiftType.SQUAT]: 0,
        [LiftType.OHP]: 0,
        [LiftType.DEADLIFT]: 0,
        [LiftType.BENCH]: 0,
      };
    }
    const cycle = settings.currentCycle;
    const isPostW3 = activeWeek >= 4;

    const calculateCurrentTM = (type: LiftType) => {
      const base = calculateTM(settings.oneRM[type], settings.tmPercentage);
      switch (type) {
        case LiftType.BENCH:
          return base + (cycle - 1) * 5 + (isPostW3 ? 2.5 : 0);
        case LiftType.OHP:
          return base + (cycle - 1) * 2.5;
        case LiftType.SQUAT:
        case LiftType.DEADLIFT:
          return base + (cycle - 1) * 10 + (isPostW3 ? 5 : 0);
        default:
          return base;
      }
    };

    return {
      [LiftType.SQUAT]: calculateCurrentTM(LiftType.SQUAT),
      [LiftType.OHP]: calculateCurrentTM(LiftType.OHP),
      [LiftType.DEADLIFT]: calculateCurrentTM(LiftType.DEADLIFT),
      [LiftType.BENCH]: calculateCurrentTM(LiftType.BENCH),
    };
  }, [settings?.oneRM, settings?.tmPercentage, settings?.currentCycle, activeWeek]);

  if (loading || !settings) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-blue-100 overflow-x-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 font-black text-sm uppercase tracking-widest">Loading...</div>
        </div>
      </div>
    );
  }

  const toggleSet = (setId: string) => {
    const key = `${settings.currentCycle}-${activeWeek}-${activeLift}-${setId}`;
    setSettings(prev => ({
      ...prev,
      completedSets: { ...prev.completedSets, [key]: !prev.completedSets[key] }
    }));
  };

  const updatePR = (setId: string, reps: number) => {
    const key = `${settings.currentCycle}-${activeWeek}-${activeLift}-${setId}`;
    setSettings(prev => ({
      ...prev,
      prRecords: { ...prev.prRecords, [key]: reps }
    }));
  };

  const handleAddAccessory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcc.name) return;

    const accessory: AccessoryExercise = {
      id: `acc-${Date.now()}`,
      name: newAcc.name,
      weight: newAcc.weight,
      sets: newAcc.sets,
      reps: newAcc.reps,
      targetLifts: [activeLift]
    };

    const libraryEntry = { name: newAcc.name, weight: newAcc.weight, sets: newAcc.sets, reps: newAcc.reps };
    const filteredLib = settings.accessoryLibrary.filter(item => item.name !== newAcc.name);

    setSettings(prev => ({
      ...prev,
      accessories: [...prev.accessories, accessory],
      accessoryLibrary: [libraryEntry, ...filteredLib].slice(0, 8) 
    }));

    setNewAcc({ name: '', weight: 0, sets: 3, reps: '10' });
    setShowAddAccessory(false);
  };

  const removeAccessory = (id: string) => {
    setSettings(prev => ({
      ...prev,
      accessories: prev.accessories.filter(a => a.id !== id)
    }));
  };

  const startNextCycle = () => {
    if (window.confirm('새 사이클을 시작하시겠습니까?\n모든 종목의 무게가 자동으로 증량됩니다.')) {
      setSettings(prev => ({
        ...prev,
        currentCycle: prev.currentCycle + 1
      }));
      handleWeekChange(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearAllHistory = () => {
    if (window.confirm('모든 히스토리 기록을 삭제하시겠습니까?')) {
      setSettings(prev => ({
        ...prev,
        history: []
      }));
    }
  };

  const logWorkout = () => {
    const sets = getSetsForWeek(activeWeek);
    const mainSetsResults = sets.map(s => {
      const key = `${settings.currentCycle}-${activeWeek}-${activeLift}-${s.id}`;
      return {
        label: s.label,
        weight: calculateWeight(currentTMs[activeLift], s.percentage),
        reps: settings.prRecords[key] || s.reps,
        completed: !!settings.completedSets[key]
      };
    });

    const dayAccs = settings.accessories
      .filter(acc => acc.targetLifts.includes(activeLift))
      .map(a => ({ name: a.name, weight: a.weight, sets: a.sets, reps: a.reps }));

    const historyEntry: WorkoutHistory = {
      id: `hist-${Date.now()}`,
      date: new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }),
      cycle: settings.currentCycle,
      week: activeWeek,
      lift: activeLift,
      mainSets: mainSetsResults,
      accessories: dayAccs
    };

    setSettings(prev => ({
      ...prev,
      history: [historyEntry, ...prev.history]
    }));
    alert('오늘의 운동이 기록되었습니다!');
  };

  const renderWorkout = () => {
    const sets = getSetsForWeek(activeWeek);
    const dayAccessories = settings.accessories.filter(acc => acc.targetLifts.includes(activeLift));

    return (
      <div className="space-y-6 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Section */}
        <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl shadow-slate-300 text-white">
          <div className="flex justify-between items-center mb-6">
            <span className="bg-blue-600 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-500/20">
              Cycle {settings.currentCycle}
            </span>
            <button 
              onClick={startNextCycle}
              className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
            >
              <RotateCcw className="w-3 h-3" />
              다음 사이클
            </button>
          </div>
          
          <div className="flex items-center justify-between bg-white/5 rounded-3xl p-2">
            <button 
              onClick={() => {
                const newWeek = (activeWeek > 1 ? activeWeek - 1 : 1) as WeekType;
                handleWeekChange(newWeek);
              }}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight">{activeWeek}주차</h2>
              <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1">
                {activeWeek === 7 ? 'Deload' : activeWeek % 3 === 1 ? 'Hypertrophy' : activeWeek % 3 === 2 ? 'Transition' : 'Strength'}
              </p>
            </div>
            <button 
              onClick={() => {
                const newWeek = (activeWeek < 7 ? activeWeek + 1 : 7) as WeekType;
                handleWeekChange(newWeek);
              }}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Lift Selection */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
          {Object.values(LiftType).map(lift => (
            <button
              key={lift}
              onClick={() => handleLiftChange(lift)}
              className={`flex-1 min-w-[100px] py-4 px-2 rounded-2xl text-[11px] font-black transition-all border ${
                activeLift === lift 
                ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200' 
                : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
              }`}
            >
              {LIFT_LABELS[lift]}
            </button>
          ))}
        </div>

        {/* Main Exercise Card */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-50/50 p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-xs uppercase tracking-widest">
              <Dumbbell className="w-4 h-4 text-blue-600" />
              Main Focus
            </h3>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-3">
               <span className="text-[9px] font-black text-slate-400 uppercase leading-none">Training Max</span>
               <span className="text-sm font-black text-blue-600">{currentTMs[activeLift].toFixed(1)}kg</span>
            </div>
          </div>
          
          <div className="divide-y divide-slate-50">
            {sets.map(set => {
              const weight = calculateWeight(currentTMs[activeLift], set.percentage);
              const key = `${settings.currentCycle}-${activeWeek}-${activeLift}-${set.id}`;
              const isDone = settings.completedSets[key];
              
              return (
                <div 
                  key={set.id} 
                  className={`p-5 flex items-center justify-between transition-all ${isDone ? 'bg-slate-50/30' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleSet(set.id)} className="focus:outline-none scale-110 active:scale-90 transition-transform">
                      {isDone ? (
                        <CheckCircle2 className="w-9 h-9 text-green-500 fill-green-50" />
                      ) : (
                        <Circle className="w-9 h-9 text-slate-100" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black tracking-tight ${isDone ? 'text-slate-200 line-through' : 'text-slate-800'}`}>
                          {weight}kg
                        </span>
                        {set.isPR && <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-lg font-black uppercase shadow-sm shadow-rose-200">PR</span>}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">{set.label} · {set.reps} Reps</p>
                    </div>
                  </div>

                  {set.isPR && (
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-10 h-8 bg-transparent text-center text-sm font-black focus:outline-none"
                        value={settings.prRecords[key] || ''}
                        onChange={(e) => updatePR(set.id, parseInt(e.target.value) || 0)}
                      />
                      <span className="text-[10px] font-black text-slate-400 pr-2">회</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Accessories Section */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-50/50 p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-xs uppercase tracking-widest">
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              Accessories
            </h3>
            <button 
              onClick={() => setShowAddAccessory(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              운동 추가
            </button>
          </div>
          
          <div className="divide-y divide-slate-50">
            {dayAccessories.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-[0.2em]">No accessories yet</p>
              </div>
            ) : (
              dayAccessories.map(acc => (
                <div key={acc.id} className="p-5 flex items-center justify-between bg-white hover:bg-slate-50/30 transition-colors">
                  <div>
                    <p className="font-black text-slate-800 text-sm mb-1">{acc.name}</p>
                    <div className="flex gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <span className="text-blue-600">{acc.weight}kg</span>
                      <span className="text-slate-200">/</span>
                      <span className="text-slate-600 font-black">{acc.sets} Sets</span>
                      <span className="text-slate-200">/</span>
                      <span className="text-slate-600 font-black">{acc.reps} Reps</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeAccessory(acc.id)}
                    className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Floating Action Button for Logging */}
        <div className="pt-4">
          <button 
            onClick={logWorkout}
            className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-slate-400 active:scale-[0.98] transition-all border border-white/10"
          >
            <div className="bg-blue-600 p-2 rounded-xl">
              <Save className="w-4 h-4 text-white" />
            </div>
            오늘의 운동 완료 & 저장
          </button>
          <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
            완료 버튼을 누르면 히스토리 탭에 저장됩니다.
          </p>
        </div>

        {/* Modal: Add Accessory */}
        {showAddAccessory && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="bg-white w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-800">보조 운동 추가</h3>
                <button onClick={() => setShowAddAccessory(false)} className="bg-slate-50 p-2.5 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              {/* Accessory Library: Horizontal Scroll of Chips */}
              {settings.accessoryLibrary.length > 0 && (
                <div className="mb-8">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block flex items-center gap-1.5 tracking-wider">
                    <Clock className="w-3 h-3 text-blue-500" />
                    최근 기록에서 불러오기
                  </label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {settings.accessoryLibrary.map((lib, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewAcc({ ...lib })}
                        className="shrink-0 bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-[11px] font-black text-slate-600 active:bg-blue-600 active:text-white transition-all whitespace-nowrap"
                      >
                        {lib.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleAddAccessory} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-wider">운동 이름</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="예: 바벨 로우"
                    value={newAcc.name}
                    onChange={e => setNewAcc({...newAcc, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-wider">무게(kg)</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-black outline-none" value={newAcc.weight} onChange={e => setNewAcc({...newAcc, weight: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-wider">세트</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-black outline-none" value={newAcc.sets} onChange={e => setNewAcc({...newAcc, sets: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-wider">횟수</label>
                    <input className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-black outline-none" value={newAcc.reps} onChange={e => setNewAcc({...newAcc, reps: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest mt-4 shadow-2xl shadow-blue-200 active:scale-[0.98] transition-all">
                  추가하기
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="space-y-6 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end px-2">
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <HistoryIcon className="w-7 h-7 text-blue-600" />
            기록
          </h2>
          {settings.history.length > 0 && (
            <button onClick={clearAllHistory} className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-xl active:bg-rose-100 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              전체 삭제
            </button>
          )}
        </div>

        {settings.history.length === 0 ? (
          <div className="bg-white rounded-[48px] p-24 text-center border border-slate-100 shadow-sm">
            <HistoryIcon className="w-16 h-16 text-slate-100 mx-auto mb-8" />
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">No logs yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {settings.history.map(entry => (
              <div key={entry.id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-blue-100">C{entry.cycle} · W{entry.week}</span>
                      <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{entry.date}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-800 tracking-tight">{LIFT_LABELS[entry.lift]}</h4>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-2.5">
                    {entry.mainSets.map((s, idx) => (
                      <div key={idx} className={`p-3 rounded-2xl text-center flex flex-col gap-1.5 border transition-all ${s.completed ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50/50 border-slate-50 opacity-30'}`}>
                        <span className="text-xs font-black text-slate-900 tracking-tighter">{s.weight}kg</span>
                        <span className="text-[9px] font-black text-blue-500 uppercase">{s.reps}회</span>
                      </div>
                    ))}
                  </div>
                  {entry.accessories.length > 0 && (
                    <div className="pt-5 border-t border-slate-50 flex flex-wrap gap-2.5">
                      {entry.accessories.map((acc, idx) => (
                        <div key={idx} className="bg-slate-900 px-4 py-2.5 rounded-2xl border border-white/5 shadow-sm">
                          <p className="text-[10px] font-black text-white/90 mb-0.5">{acc.name}</p>
                          <p className="text-[9px] font-black text-blue-400 uppercase">{acc.weight}kg · {acc.sets}S</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="space-y-6 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-3xl font-black text-slate-900 px-2 flex items-center gap-2 tracking-tight">
          <Settings className="w-7 h-7 text-slate-400" />
          설정
        </h2>

        <div className="bg-white rounded-[48px] p-8 border border-slate-100 space-y-10 shadow-sm">
          <div>
            <h3 className="font-black text-slate-900 border-b border-slate-50 pb-5 mb-8 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Dumbbell className="w-5 h-5" /></div>
              1RM 데이터 업데이트
            </h3>
            <div className="grid grid-cols-2 gap-8">
              {Object.entries(LIFT_LABELS).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">{label}</label>
                  <input
                    type="number"
                    value={settings.oneRM[key as LiftType]}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      oneRM: { ...prev.oneRM, [key as LiftType]: parseFloat(e.target.value) || 0 }
                    }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] p-4 font-black text-slate-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center mb-5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Training Max 비율</label>
               <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-xs font-black shadow-lg shadow-blue-100">{Math.round(settings.tmPercentage * 100)}%</span>
            </div>
            <input 
              type="range" min="0.8" max="1.0" step="0.05" value={settings.tmPercentage}
              onChange={(e) => setSettings(prev => ({ ...prev, tmPercentage: parseFloat(e.target.value) }))}
              className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 shadow-inner"
            />
            <div className="flex justify-between mt-3 px-1">
              <span className="text-[10px] font-black text-slate-300 uppercase">Lite</span>
              <span className="text-[10px] font-black text-slate-300 uppercase">Heavy</span>
            </div>
          </div>
        </div>

        <div className="bg-rose-50 rounded-[40px] p-8 border border-rose-100 shadow-sm">
           <h4 className="font-black text-rose-600 text-[11px] uppercase mb-3 tracking-widest flex items-center gap-2">
             <Info className="w-4 h-4" />
             전체 초기화
           </h4>
           <p className="text-[10px] text-rose-400 font-bold mb-6 leading-relaxed">
             주의: 진행 중인 사이클과 체크 내역이 모두 리셋됩니다.<br/>기존 운동 히스토리는 유지됩니다.
           </p>
           <button 
             onClick={() => { if(window.confirm('정말 전체 진행 상황을 초기화하시겠습니까?')) setSettings(prev => ({ ...prev, completedSets: {}, prRecords: {}, currentCycle: 1 })); }}
             className="w-full py-5 bg-white text-rose-600 font-black text-[11px] uppercase rounded-2xl shadow-xl shadow-rose-100 border border-rose-100 active:scale-95 transition-all mb-4"
           >
             프로그램 리셋하기
           </button>
        </div>

        <div className="bg-slate-50 rounded-[40px] p-8 border border-slate-100 shadow-sm">
           <button 
             onClick={async () => {
               if (window.confirm('로그아웃하시겠습니까?')) {
                 await supabase.auth.signOut();
                 window.location.reload();
               }
             }}
             className="w-full py-5 bg-slate-900 text-white font-black text-[11px] uppercase rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all"
           >
             로그아웃
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-blue-100 overflow-x-hidden">
      <header className="px-6 pt-14 pb-6 bg-white/70 backdrop-blur-2xl sticky top-0 z-[60] border-b border-slate-100">
        <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase">
          <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center -rotate-3 shadow-2xl shadow-slate-300">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          Wendler <span className="text-blue-600">5/3/1</span>
        </h1>
      </header>

      <main className="flex-1 px-5 pt-8">
        {activeTab === 'workout' && renderWorkout()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {/* Modern High-End Floating Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[70] px-6 pb-12 pt-4 max-w-md mx-auto pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-3xl rounded-[40px] p-2.5 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto border border-white/10 ring-1 ring-white/5">
          <button 
            onClick={() => handleTabChange('workout')} 
            className={`flex-1 flex flex-col items-center gap-2 py-3.5 transition-all rounded-[32px] ${activeTab === 'workout' ? 'bg-white/10 text-white scale-[1.05]' : 'text-slate-500 opacity-60'}`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'workout' ? 'text-blue-500' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Workout</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('history')} 
            className={`flex-1 flex flex-col items-center gap-2 py-3.5 transition-all rounded-[32px] ${activeTab === 'history' ? 'bg-white/10 text-white scale-[1.05]' : 'text-slate-500 opacity-60'}`}
          >
            <HistoryIcon className={`w-5 h-5 ${activeTab === 'history' ? 'text-blue-500' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">History</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('settings')} 
            className={`flex-1 flex flex-col items-center gap-2 py-3.5 transition-all rounded-[32px] ${activeTab === 'settings' ? 'bg-white/10 text-white scale-[1.05]' : 'text-slate-500 opacity-60'}`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-blue-500' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Settings</span>
          </button>
        </div>
      </nav>
      
      {/* Visual Safety Margin for Bottom */}
      <div className="h-10"></div>
    </div>
  );
};

export default App;
