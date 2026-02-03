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
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  PlusCircle,
  X,
  Clock,
  Pencil,
  TrendingUp,
} from 'lucide-react';
import { OneRMCalculator } from './OneRMCalculator';
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
import {
  getWeekSummary,
  getWeeklyE1RMPerLift,
  getLiftE1RMSummary,
  getEntrySortKey,
} from '@/utils/history-analysis';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/lib/supabase/client';

const App: React.FC = () => {
  const { settings, setSettings, loading } = useUserSettings();
  
  // localStorage에서 마지막 상태 복원
  const [activeTab, setActiveTab] = useState<'workout' | 'history' | 'settings' | 'guide' | 'analysis'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wendler_last_tab');
      if (saved && ['workout', 'history', 'settings', 'guide', 'analysis'].includes(saved)) {
        return saved as 'workout' | 'history' | 'settings' | 'guide' | 'analysis';
      }
    }
    return 'workout';
  });
  
  // 탭 변경 시 localStorage에 저장
  const handleTabChange = (tab: 'workout' | 'history' | 'settings' | 'guide' | 'analysis') => {
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
  const [editingAccessoryId, setEditingAccessoryId] = useState<string | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  
  // Form state for new accessory
  const [newAcc, setNewAcc] = useState({ name: '', weight: 0, sets: 3, reps: '10' });
  
  // Form state for editing history
  const [editingHistory, setEditingHistory] = useState<WorkoutHistory | null>(null);
  
  // 1RM Calculator state
  const [showOneRMCalculator, setShowOneRMCalculator] = useState(false);
  const [calculatorTargetLift, setCalculatorTargetLift] = useState<Exclude<LiftType, LiftType.WEAKNESS> | null>(null);
  
  // Guide accordion state
  const [openGuideSections, setOpenGuideSections] = useState<Set<string>>(new Set(['what', 'cycle']));
  // History accordion: which cycle and which week are expanded (e.g. "1-2" = cycle 1 week 2)
  const [openHistoryCycles, setOpenHistoryCycles] = useState<Set<number>>(new Set());
  const [openHistoryWeeks, setOpenHistoryWeeks] = useState<Set<string>>(new Set());
  // Analysis tab: which lift section is expanded
  const [openAnalysisLift, setOpenAnalysisLift] = useState<Exclude<LiftType, LiftType.WEAKNESS> | null>(null);

  // TM Calculation Logic based on user's specific progression rules
  const currentTMs = useMemo(() => {
    if (!settings) {
      return {
        [LiftType.SQUAT]: 0,
        [LiftType.OHP]: 0,
        [LiftType.DEADLIFT]: 0,
        [LiftType.BENCH]: 0,
        [LiftType.WEAKNESS]: 0,
      };
    }
    const cycle = settings.currentCycle;
    const isPostW3 = activeWeek >= 4;

    const calculateCurrentTM = (type: Exclude<LiftType, LiftType.WEAKNESS>) => {
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
      [LiftType.WEAKNESS]: 0, // 약점 보완은 TM 없음
    };
  }, [settings?.oneRM, settings?.tmPercentage, settings?.currentCycle, activeWeek]);

  const historyByCycleWeek = useMemo(() => {
    const history = settings?.history ?? [];
    const map = new Map<number, Map<number, WorkoutHistory[]>>();
    const sorted = [...history].sort((a, b) => getEntrySortKey(b) - getEntrySortKey(a));
    for (const entry of sorted) {
      if (!map.has(entry.cycle)) map.set(entry.cycle, new Map());
      const weekMap = map.get(entry.cycle)!;
      if (!weekMap.has(entry.week)) weekMap.set(entry.week, []);
      weekMap.get(entry.week)!.push(entry);
    }
    return map;
  }, [settings?.history]);

  const weeklyE1RMPerLift = useMemo(
    () => getWeeklyE1RMPerLift(settings?.history ?? []),
    [settings?.history]
  );

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

    if (editingAccessoryId) {
      // 편집 모드
      setSettings(prev => ({
        ...prev,
        accessories: prev.accessories.map(acc => 
          acc.id === editingAccessoryId
            ? {
                ...acc,
                name: newAcc.name,
                weight: newAcc.weight,
                sets: newAcc.sets,
                reps: newAcc.reps
              }
            : acc
        )
      }));
      setEditingAccessoryId(null);
    } else {
      // 추가 모드
      const accessory: AccessoryExercise = {
        id: `acc-${Date.now()}`,
        name: newAcc.name,
        weight: newAcc.weight,
        sets: newAcc.sets,
        reps: newAcc.reps,
        targetLifts: activeLift === LiftType.WEAKNESS ? [LiftType.WEAKNESS] : [activeLift]
      };

      const libraryEntry = { name: newAcc.name, weight: newAcc.weight, sets: newAcc.sets, reps: newAcc.reps };
      const filteredLib = settings.accessoryLibrary.filter(item => item.name !== newAcc.name);

      setSettings(prev => ({
        ...prev,
        accessories: [...prev.accessories, accessory],
        accessoryLibrary: [libraryEntry, ...filteredLib].slice(0, 8) 
      }));
    }

    setNewAcc({ name: '', weight: 0, sets: 3, reps: '10' });
    setShowAddAccessory(false);
  };

  const handleEditAccessory = (acc: AccessoryExercise) => {
    setNewAcc({
      name: acc.name,
      weight: acc.weight,
      sets: acc.sets,
      reps: acc.reps
    });
    setEditingAccessoryId(acc.id);
    setShowAddAccessory(true);
  };

  const removeAccessory = (id: string) => {
    setSettings(prev => ({
      ...prev,
      accessories: prev.accessories.map(acc => {
        if (acc.id !== id) return acc;
        
        // 현재 리프트를 targetLifts에서 제거
        const newTargetLifts = acc.targetLifts.filter(lift => lift !== activeLift);
        
        // targetLifts가 비어있으면 완전히 삭제, 아니면 업데이트
        if (newTargetLifts.length === 0) {
          return null; // 필터에서 제거됨
        }
        return {
          ...acc,
          targetLifts: newTargetLifts
        };
      }).filter(Boolean) as AccessoryExercise[] // null 제거
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

  const deleteHistoryItem = (id: string) => {
    if (window.confirm('이 기록을 삭제하시겠습니까?')) {
      setSettings(prev => ({
        ...prev,
        history: prev.history.filter(item => item.id !== id)
      }));
    }
  };

  const handleEditHistory = (entry: WorkoutHistory) => {
    setEditingHistory(JSON.parse(JSON.stringify(entry))); // Deep copy
    setEditingHistoryId(entry.id);
  };

  const handleSaveHistoryEdit = () => {
    if (!editingHistory) return;

    setSettings(prev => ({
      ...prev,
      history: prev.history.map(item => 
        item.id === editingHistoryId ? editingHistory : item
      )
    }));

    setEditingHistory(null);
    setEditingHistoryId(null);
  };

  const updateHistoryMainSet = (setIndex: number, field: 'weight' | 'reps' | 'completed', value: number | string | boolean) => {
    if (!editingHistory) return;
    setEditingHistory({
      ...editingHistory,
      mainSets: editingHistory.mainSets.map((set, idx) => 
        idx === setIndex ? { ...set, [field]: value } : set
      )
    });
  };

  const updateHistoryAccessory = (accIndex: number, field: 'name' | 'weight' | 'sets' | 'reps', value: string | number) => {
    if (!editingHistory) return;
    setEditingHistory({
      ...editingHistory,
      accessories: editingHistory.accessories.map((acc, idx) => 
        idx === accIndex ? { ...acc, [field]: value } : acc
      )
    });
  };

  const addHistoryAccessory = () => {
    if (!editingHistory) return;
    setEditingHistory({
      ...editingHistory,
      accessories: [...editingHistory.accessories, { name: '', weight: 0, sets: 3, reps: '10' }]
    });
  };

  const removeHistoryAccessory = (accIndex: number) => {
    if (!editingHistory) return;
    setEditingHistory({
      ...editingHistory,
      accessories: editingHistory.accessories.filter((_, idx) => idx !== accIndex)
    });
  };

  const logWorkout = () => {
    // 약점 보완일 때는 메인 세트 없음
    let mainSetsResults: { weight: number; reps: number | string; label: string; completed: boolean }[] = [];
    
    if (activeLift !== LiftType.WEAKNESS) {
      const sets = getSetsForWeek(activeWeek);
      mainSetsResults = sets.map(s => {
        const key = `${settings.currentCycle}-${activeWeek}-${activeLift}-${s.id}`;
        return {
          label: s.label,
          weight: calculateWeight(currentTMs[activeLift], s.percentage),
          reps: settings.prRecords[key] || s.reps,
          completed: !!settings.completedSets[key]
        };
      });
    }

    // 약점 보완일 때는 모든 악세사리, 아니면 해당 리프트의 악세사리만
    const dayAccs = activeLift === LiftType.WEAKNESS
      ? settings.accessories.map(a => ({ name: a.name, weight: a.weight, sets: a.sets, reps: a.reps }))
      : settings.accessories
          .filter(acc => acc.targetLifts.includes(activeLift))
          .map(a => ({ name: a.name, weight: a.weight, sets: a.sets, reps: a.reps }));

    const historyEntry: WorkoutHistory = {
      id: `hist-${Date.now()}`,
      date: new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }),
      timestamp: Date.now(),
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
    // 약점 보완일 때는 모든 악세사리 표시, 아니면 해당 리프트의 악세사리만
    const dayAccessories = activeLift === LiftType.WEAKNESS
      ? settings.accessories
      : settings.accessories.filter(acc => acc.targetLifts.includes(activeLift));

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

        {/* Main Exercise Card - 약점 보완일 때는 표시하지 않음 */}
        {activeLift !== LiftType.WEAKNESS && (
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
        )}

        {/* 약점 보완일 때 안내 메시지 */}
        {activeLift === LiftType.WEAKNESS && (
          <div className="bg-blue-50 rounded-[32px] p-6 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-blue-900 text-sm">약점 보완 운동</h3>
            </div>
            <p className="text-xs text-blue-700 font-bold">
              약점 보완 운동은 메인 세트 없이 악세사리 운동만 수행합니다.
            </p>
          </div>
        )}

        {/* Accessories Section */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-50/50 p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-xs uppercase tracking-widest">
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              Accessories
            </h3>
            <button 
              onClick={() => {
                setEditingAccessoryId(null);
                setNewAcc({ name: '', weight: 0, sets: 3, reps: '10' });
                setShowAddAccessory(true);
              }}
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
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditAccessory(acc)}
                      className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      aria-label="편집"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removeAccessory(acc.id)}
                      className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      aria-label="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
                <h3 className="text-xl font-black text-slate-800">
                  {editingAccessoryId ? '보조 운동 편집' : '보조 운동 추가'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddAccessory(false);
                    setEditingAccessoryId(null);
                    setNewAcc({ name: '', weight: 0, sets: 3, reps: '10' });
                  }} 
                  className="bg-slate-50 p-2.5 rounded-full text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
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
                  {editingAccessoryId ? '수정하기' : '추가하기'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    const cycles = Array.from(historyByCycleWeek.keys()).sort((a, b) => a - b);

    const toggleCycle = (c: number) => {
      setOpenHistoryCycles(prev => {
        const next = new Set(prev);
        if (next.has(c)) next.delete(c);
        else next.add(c);
        return next;
      });
    };
    const toggleWeek = (c: number, w: number) => {
      const key = `${c}-${w}`;
      setOpenHistoryWeeks(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };

    const renderHistoryCard = (entry: WorkoutHistory) => (
      <div key={entry.id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-blue-100">C{entry.cycle} · W{entry.week}</span>
              <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{entry.date}</span>
            </div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight">{LIFT_LABELS[entry.lift]}</h4>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleEditHistory(entry)}
              className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
              aria-label="편집"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              onClick={() => deleteHistoryItem(entry.id)}
              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
              aria-label="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
                  <p className="text-[9px] font-black text-blue-400 uppercase">{acc.weight}kg · {acc.sets}S · {acc.reps}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );

    const mainLiftsOrder = [LiftType.SQUAT, LiftType.BENCH, LiftType.DEADLIFT, LiftType.OHP];

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
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">아직 기록이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cycles.map(cycle => {
              const weekMap = historyByCycleWeek.get(cycle)!;
              const weeks = Array.from(weekMap.keys()).sort((a, b) => a - b);
              const isCycleOpen = openHistoryCycles.has(cycle);
              return (
                <div key={cycle} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleCycle(cycle)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="text-lg font-black text-slate-800">C{cycle}</span>
                    {isCycleOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>
                  {isCycleOpen && (
                    <div className="border-t border-slate-50 px-3 pb-3 space-y-2">
                      {weeks.map(week => {
                        const entries = weekMap.get(week)!;
                        const summary = getWeekSummary(entries);
                        const weekKey = `${cycle}-${week}`;
                        const isWeekOpen = openHistoryWeeks.has(weekKey);
                        const weekLabel = week === 7 ? 'Deload' : `W${week}`;
                        return (
                          <div key={weekKey} className="rounded-2xl border border-slate-100 overflow-hidden">
                            <button
                              onClick={() => toggleWeek(cycle, week)}
                              className="w-full flex items-center justify-between p-4 bg-slate-50/50 text-left"
                            >
                              <span className="font-black text-slate-800">{weekLabel}</span>
                              <div className="flex items-center gap-4 text-[11px] font-black text-slate-500">
                                <span>완료 {summary.completionPct}%</span>
                                <span>볼륨 {Math.round(summary.totalVolumeKg)}kg</span>
                                <span>PR {summary.prCount}개</span>
                              </div>
                              {isWeekOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                            </button>
                            {isWeekOpen && (
                              <div className="p-4 pt-0 space-y-4">
                                {mainLiftsOrder.map(lift => {
                                  const liftEntries = entries.filter(e => e.lift === lift);
                                  if (liftEntries.length === 0) return null;
                                  return (
                                    <div key={lift}>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">{LIFT_LABELS[lift]}</p>
                                      <div className="space-y-3">
                                        {liftEntries.map(entry => renderHistoryCard(entry))}
                                      </div>
                                    </div>
                                  );
                                })}
                                {entries.filter(e => e.lift === LiftType.WEAKNESS).length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">{LIFT_LABELS[LiftType.WEAKNESS]}</p>
                                    <div className="space-y-3">
                                      {entries.filter(e => e.lift === LiftType.WEAKNESS).map(entry => renderHistoryCard(entry))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Edit History */}
        {editingHistory && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="bg-white w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-white pb-4 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-800">기록 편집</h3>
                <button 
                  onClick={() => {
                    setEditingHistory(null);
                    setEditingHistoryId(null);
                  }} 
                  className="bg-slate-50 p-2.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Main Sets */}
                {editingHistory.mainSets.length > 0 && (
                  <div>
                    <h4 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">메인 세트</h4>
                    <div className="space-y-3">
                      {editingHistory.mainSets.map((set, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black text-slate-600">{set.label}</span>
                            <label className="flex items-center gap-2 text-xs font-black text-slate-600">
                              <input
                                type="checkbox"
                                checked={set.completed}
                                onChange={(e) => updateHistoryMainSet(idx, 'completed', e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300"
                              />
                              완료
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">무게(kg)</label>
                              <input
                                type="number"
                                value={set.weight}
                                onChange={(e) => updateHistoryMainSet(idx, 'weight', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white border border-slate-200 p-2 rounded-xl text-sm font-black outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">횟수</label>
                              <input
                                type="text"
                                value={set.reps}
                                onChange={(e) => updateHistoryMainSet(idx, 'reps', e.target.value)}
                                className="w-full bg-white border border-slate-200 p-2 rounded-xl text-sm font-black outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accessories */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">악세사리</h4>
                    <button
                      onClick={addHistoryAccessory}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100 active:scale-95 transition-all"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      추가
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editingHistory.accessories.map((acc, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black text-slate-600">악세사리 {idx + 1}</span>
                          <button
                            onClick={() => removeHistoryAccessory(idx)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">이름</label>
                            <input
                              type="text"
                              value={acc.name}
                              onChange={(e) => updateHistoryAccessory(idx, 'name', e.target.value)}
                              className="w-full bg-white border border-slate-200 p-2 rounded-xl text-sm font-black outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">무게(kg)</label>
                            <input
                              type="number"
                              value={acc.weight}
                              onChange={(e) => updateHistoryAccessory(idx, 'weight', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 p-2 rounded-xl text-sm font-black outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">세트</label>
                            <input
                              type="number"
                              value={acc.sets}
                              onChange={(e) => updateHistoryAccessory(idx, 'sets', parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 p-2 rounded-xl text-sm font-black outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">횟수</label>
                            <input
                              type="text"
                              value={acc.reps}
                              onChange={(e) => updateHistoryAccessory(idx, 'reps', e.target.value)}
                              className="w-full bg-white border border-slate-200 p-2 rounded-xl text-sm font-black outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {editingHistory.accessories.length === 0 && (
                      <div className="text-center py-8 text-slate-300 text-xs font-black uppercase">
                        악세사리가 없습니다
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSaveHistoryEdit}
                  className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest mt-4 shadow-2xl shadow-blue-200 active:scale-[0.98] transition-all"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalysis = () => {
    const analysisLifts: Exclude<LiftType, LiftType.WEAKNESS>[] = [
      LiftType.SQUAT,
      LiftType.BENCH,
      LiftType.DEADLIFT,
      LiftType.OHP,
    ];

    const E1RMChart: React.FC<{
      points: { weekLabel: string; e1RM: number; tooltip: string }[];
      liftLabel: string;
    }> = ({ points, liftLabel }) => {
      if (points.length < 2) {
        return (
          <p className="text-sm text-slate-500 py-6 text-center">기록이 쌓이면 추세를 보여드릴게요.</p>
        );
      }
      const padding = { top: 16, right: 8, bottom: 28, left: 36 };
      const w = 280;
      const h = 160;
      const xMin = 0;
      const xMax = w - padding.left - padding.right;
      const yMin = 0;
      const yMax = h - padding.top - padding.bottom;
      const minE1RM = Math.min(...points.map(p => p.e1RM));
      const maxE1RM = Math.max(...points.map(p => p.e1RM));
      const range = maxE1RM - minE1RM || 1;
      const yScale = (v: number) => padding.top + yMax - ((v - minE1RM) / range) * yMax;
      const xScale = (i: number) => padding.left + (i / (points.length - 1)) * xMax;
      const pathD = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.e1RM)}`)
        .join(' ');
      return (
        <div className="mt-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">예상 1RM (e1RM)</p>
          <p className="text-[10px] text-slate-400 mb-3">세트 기록을 기반으로 계산된 추정값입니다.</p>
          <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <polyline
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points.map((p, i) => `${xScale(i)},${yScale(p.e1RM)}`).join(' ')}
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={xScale(i)}
                cy={yScale(p.e1RM)}
                r="4"
                fill="rgb(59, 130, 246)"
                className="cursor-pointer"
              >
                <title>{p.tooltip}</title>
              </circle>
            ))}
            {points.map((p, i) => (
              <text
                key={`l-${i}`}
                x={xScale(i)}
                y={h - 6}
                textAnchor="middle"
                className="text-[9px] fill-slate-400 font-bold"
              >
                {p.weekLabel}
              </text>
            ))}
          </svg>
        </div>
      );
    };

    return (
      <div className="space-y-6 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-3xl font-black text-slate-900 px-2 flex items-center gap-2 tracking-tight">
          <TrendingUp className="w-7 h-7 text-blue-600" />
          분석
        </h2>

        <div className="space-y-3">
          {analysisLifts.map(lift => {
            const points = weeklyE1RMPerLift[lift];
            const summary = getLiftE1RMSummary(points);
            const isOpen = openAnalysisLift === lift;
            return (
              <div key={lift} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenAnalysisLift(isOpen ? null : lift)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 p-5 text-left"
                >
                  <span className="font-black text-slate-800">{LIFT_LABELS[lift]}</span>
                  <div className="flex items-center gap-4 text-[11px] font-black text-slate-500">
                    <span>e1RM {summary.latest > 0 ? `${summary.latest}kg` : '—'}</span>
                    {summary.change4w != null && (
                      <span>{summary.change4w >= 0 ? '+' : ''}{summary.change4w}kg (4주)</span>
                    )}
                    <span>최고 {summary.max > 0 ? `${summary.max}kg` : '—'}</span>
                  </div>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-50 pt-4">
                    <E1RMChart points={points} liftLabel={LIFT_LABELS[lift]} />
                    {summary.change4w != null && Math.abs(summary.change4w) < 2.5 && points.length >= 2 && (
                      <p className="text-[10px] text-slate-400 mt-3">정체 구간으로 보일 수 있습니다.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
              {Object.entries(LIFT_LABELS)
                .filter(([key]) => key !== LiftType.WEAKNESS) // 약점 보완 제외
                .map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">{label}</label>
                    <input
                      type="number"
                      value={settings.oneRM[key as Exclude<LiftType, LiftType.WEAKNESS>]}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        oneRM: { ...prev.oneRM, [key as Exclude<LiftType, LiftType.WEAKNESS>]: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-[20px] p-4 font-black text-slate-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg"
                    />
                  </div>
                ))}
            </div>
            <div className="mt-6">
              <button
                onClick={() => {
                  setCalculatorTargetLift(null);
                  setShowOneRMCalculator(true);
                }}
                className="w-full py-4 bg-blue-50 border border-blue-100 text-blue-600 font-black text-[11px] uppercase rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Info className="w-4 h-4" />
                최근 운동 기록으로 1RM 계산하기
              </button>
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

  const renderGuide = () => {
    const toggleSection = (section: string) => {
      setOpenGuideSections(prev => {
        const next = new Set(prev);
        if (next.has(section)) {
          next.delete(section);
        } else {
          next.add(section);
        }
        return next;
      });
    };

    const sections = [
      {
        id: 'what',
        title: '5/3/1이란?',
        content: '최대 중량보다 낮은 무게를 사용하여 점진적으로 강도를 높여가는 근력 훈련 프로그램입니다. 매 세션마다 최대 중량을 들기보다는 시간에 걸쳐 근력을 쌓는 것에 중점을 둡니다.'
      },
      {
        id: 'cycle',
        title: '사이클 구조',
        content: '각 사이클은 7주로 구성됩니다: 메인 운동 3주, 보조 운동 3주, 그리고 디로딩 1주. 디로딩 후에는 Training Max를 증가시켜 새로운 사이클을 시작합니다.'
      },
      {
        id: 'tm',
        title: 'Training Max (TM)',
        content: '실제 1RM의 90%를 시작점으로 사용합니다. 이 보수적인 접근 방식은 모든 반복을 올바른 자세로 완료할 수 있게 보장하며, 과로 없이 장기적인 진전을 가능하게 합니다.'
      },
      {
        id: 'flow',
        title: '주간 흐름',
        content: '워밍업 세트 → 메인 워킹 세트 → PR 세트 (최대한 많은 반복, "x+"로 표시) → 강할 때 선택적 조커 세트. 항상 무게보다 자세를 우선시하세요.'
      },
      {
        id: 'pr-joker',
        title: 'PR & 조커 규칙',
        content: 'PR 세트는 RPE 9 정도(여유 반복 1개)에서 멈추세요. 피로하거나 자세가 무너지면 조커 세트를 건너뛰세요. 이것들은 선택적인 강도 부스터이며 필수는 아닙니다.'
      },
      {
        id: 'supplemental',
        title: '보조 운동',
        content: '하나의 접근 방식을 선택하세요: FSL (First Set Last - 첫 워킹 세트 반복), SSL (Second Set Last), 또는 BBB (Boring But Big - 가벼운 무게로 5x10). 프로그램을 섞지 마세요.'
      },
      {
        id: 'who',
        title: '누구에게 적합한가 / 부적합한가',
        content: '꾸준하고 지속 가능한 근력 향상을 원하는 중급~고급 운동자에게 가장 적합합니다. 완전 초보자나 지속적인 다양성이나 고빈도 훈련이 필요한 사람에게는 이상적이지 않습니다.'
      }
    ];

    return (
      <div className="space-y-6 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-3xl font-black text-slate-900 px-2 flex items-center gap-2 tracking-tight">
          <Info className="w-7 h-7 text-blue-600" />
          가이드
        </h2>

        <div className="space-y-3">
          {sections.map(section => {
            const isOpen = openGuideSections.has(section.id);
            return (
              <div key={section.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
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
        {activeTab === 'analysis' && renderAnalysis()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'guide' && renderGuide()}
      </main>

      {/* Modern High-End Floating Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[70] px-6 pb-12 pt-4 max-w-md mx-auto pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-3xl rounded-[40px] p-2.5 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto border border-white/10 ring-1 ring-white/5">
          <button 
            onClick={() => handleTabChange('workout')} 
            className={`flex-1 flex flex-col items-center gap-2 py-3.5 transition-all rounded-[32px] ${activeTab === 'workout' ? 'bg-white/10 text-white scale-[1.05]' : 'text-slate-500 opacity-60'}`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'workout' ? 'text-blue-500' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">운동</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('history')} 
            className={`flex-1 flex flex-col items-center gap-2 py-3.5 transition-all rounded-[32px] ${activeTab === 'history' ? 'bg-white/10 text-white scale-[1.05]' : 'text-slate-500 opacity-60'}`}
          >
            <HistoryIcon className={`w-5 h-5 ${activeTab === 'history' ? 'text-blue-500' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">기록</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('analysis')} 
            className={`flex-1 flex flex-col items-center gap-2 py-3.5 transition-all rounded-[32px] ${activeTab === 'analysis' ? 'bg-white/10 text-white scale-[1.05]' : 'text-slate-500 opacity-60'}`}
          >
            <TrendingUp className={`w-5 h-5 ${activeTab === 'analysis' ? 'text-blue-500' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">분석</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('settings')} 
            className={`flex-1 flex flex-col items-center gap-2 py-3.5 transition-all rounded-[32px] ${activeTab === 'settings' ? 'bg-white/10 text-white scale-[1.05]' : 'text-slate-500 opacity-60'}`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-blue-500' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">설정</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('guide')} 
            className={`flex-1 flex flex-col items-center gap-2 py-3.5 transition-all rounded-[32px] ${activeTab === 'guide' ? 'bg-white/10 text-white scale-[1.05]' : 'text-slate-500 opacity-60'}`}
          >
            <Info className={`w-5 h-5 ${activeTab === 'guide' ? 'text-blue-500' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">가이드</span>
          </button>
        </div>
      </nav>
      
      {/* Visual Safety Margin for Bottom */}
      <div className="h-10"></div>

      {/* 1RM Calculator Modal */}
      <OneRMCalculator
        isOpen={showOneRMCalculator}
        onClose={() => {
          setShowOneRMCalculator(false);
          setCalculatorTargetLift(null);
        }}
        onApply={(oneRM, liftType) => {
          if (liftType) {
            setSettings(prev => ({
              ...prev,
              oneRM: { ...prev.oneRM, [liftType]: oneRM }
            }));
          }
        }}
        targetLift={calculatorTargetLift}
      />
    </div>
  );
};

export default App;
