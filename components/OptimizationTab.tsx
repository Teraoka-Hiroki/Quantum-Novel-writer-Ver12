import React from 'react';
import { AppState } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Send, Cpu, Layers, Target, AlignJustify, CheckSquare } from 'lucide-react';

interface Props {
  state: AppState; updateState: (updates: Partial<AppState>) => void;
  updateCandidateAdoption: (id: number, adopted: boolean) => void;
  runCustomOptimization: () => void; runLegacy: () => void;
  isLoading: boolean; plotData: any[];
}

export const OptimizationTab: React.FC<Props> = ({ state, updateCandidateAdoption, runCustomOptimization, runLegacy, isLoading, plotData }) => {
  const selectedCandidates = state.candidates.filter(c => c.selected);
  const currentLength = selectedCandidates.reduce((sum, c) => sum + c.text.length, 0);
  const targetLength = state.params.length;
  const diffLength = currentLength - targetLength;
  
  const renderCandidateGroup = (type: 'Scene Craft' | 'Character Dynamics') => {
    const group = state.candidates.filter(c => c.type === type);
    if (group.length === 0) return null;
    const displayType = type === 'Scene Craft' ? 'シーン描写' : 'キャラクター造形';

    return (
      <div className="mb-6" key={type}>
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-4 py-2 rounded-lg mb-3 flex items-center font-bold shadow-md"><Layers className="w-4 h-4 mr-2" /> {displayType}</div>
        <div className="space-y-3">
            {group.map(item => (
                <div key={item.id} className={`relative p-4 rounded-xl border transition-all duration-200 ${item.selected ? 'bg-slate-800 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] border-l-4' : 'bg-slate-800 border-transparent border-l-4 border-l-transparent hover:translate-y-[-2px] hover:shadow-lg'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-white ${type === 'Scene Craft' ? 'bg-emerald-700' : 'bg-amber-800'}`}>{displayType}</span>
                        <div className="flex items-center bg-slate-900 rounded-full px-3 py-1 gap-2">
                            <label className="cursor-pointer flex items-center text-sm font-bold text-gray-300 hover:text-blue-400 transition">
                                <input type="checkbox" className="mr-2 w-4 h-4 accent-blue-500 cursor-pointer" checked={!!item.user_adopted} onChange={(e) => updateCandidateAdoption(item.id, e.target.checked)} />
                                採用
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-slate-700 text-xs text-gray-400">
                        <span className="font-bold text-blue-400 flex items-center"><Target className="w-3 h-3 mr-1" /> 適合度: {item.relevance.toFixed(2)}</span>
                        <span className="bg-slate-700/50 px-2 py-0.5 rounded-full flex items-center"><AlignJustify className="w-3 h-3 mr-1" /> {item.text.length}文字</span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed">{item.text}</p>
                </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fadeIn">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600 mb-6 shadow-xl">
            <div className="flex justify-between items-center mb-4"><h5 className="text-xl font-bold text-blue-400 flex items-center"><CheckSquare className="w-6 h-6 mr-2" /> 多目的最適化</h5></div>
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">ユーザーが「採用」した部品を優先しつつ、シーン・パラメータ関連度と文字数制約を考慮して最適な組み合わせを探索します。</p>
            <div className="flex justify-end items-end">
                <button onClick={runCustomOptimization} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center transition disabled:opacity-50">
                    {isLoading ? <span className="animate-spin mr-2">⟳</span> : <Send className="w-4 h-4 mr-2" />} ユーザの指示を反映して最適化
                </button>
            </div>
            {state.optimization_scales && (
                <div className="mt-4 pt-3 border-t border-slate-600/50 flex flex-wrap gap-4 text-xs text-gray-300 items-center">
                    <span className="font-semibold">ステータス:</span>
                    <div className={`px-2 py-0.5 rounded flex items-center border ${Math.abs(diffLength) < 10 ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-300' : 'bg-amber-900/30 border-amber-500/30 text-amber-300'}`}>
                        <AlignJustify className="w-3 h-3 mr-1" />合計文字数: <strong className="mx-1 text-sm">{currentLength}</strong> / {targetLength} 
                    </div>
                </div>
            )}
        </div>
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <div><h5 className="font-bold text-gray-200">候補ブロック</h5><p className="text-xs text-gray-500">好きなブロックを「採用」にチェックしてください。</p></div>
            <button onClick={runLegacy} disabled={isLoading} className="text-xs border border-slate-600 text-gray-400 hover:text-white px-3 py-1 rounded-full transition flex items-center"><Cpu className="w-3 h-3 mr-1" /> パラメータのみで最適化</button>
        </div>
        {state.candidates.length === 0 ? <div className="text-center py-10 text-gray-500 bg-slate-800/50 rounded-lg">候補がありません。</div> : <div>{renderCandidateGroup('Scene Craft')}{renderCandidateGroup('Character Dynamics')}</div>}
    </div>
  );
};