import React, { useState } from 'react';
import { SettingsTab } from './components/SettingsTab';
import { OptimizationTab } from './components/OptimizationTab';
import { DraftTab } from './components/DraftTab';
import { FinalTab } from './components/FinalTab';
import { IllustrationTab } from './components/IllustrationTab';
import { AppState, Params } from './types';
import * as api from './services/api';
import { Layout, Settings, Cpu, PenTool, FileText, Image as ImageIcon } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  
  const [state, setState] = useState<AppState>({
    gemini_key: '', amplify_token: '', replicate_token: '', topic_main: '', topic_sub1: '', topic_sub2: '',
    params: {
        p_desc_style: 0.5, p_perspective: 0.5, p_sensory: 0.5, p_thought: 0.5, p_tension: 0.5, p_reality: 0.5,
        p_char_count: 0.2, p_char_mental: 0.5, p_char_belief: 0.5, p_char_trauma: 0.0, p_char_voice: 0.5, length: 500
    },
    candidates: [], bbo_history_count: 0, draft_summary: '', draft_article: '', additional_instruction: '', final_text: '',
    optimization_scales: { pref: 0, diff: 0, constraint: 0 }, optimization_plot_data: [],
    illustration_scenes: [], illustration_styles: [], selected_scene: '', selected_style: '', illustration_custom: '', illustration_style_choice: 'リアリスティック', generated_images: []
  });

  const [plotData, setPlotData] = useState<any[]>([]);
  const updateState = (updates: Partial<AppState>) => setState(prev => ({ ...prev, ...updates }));
  const updateParams = (updates: Partial<Params>) => setState(prev => ({ ...prev, params: { ...prev.params, ...updates } }));

  const handleGenerateCandidates = async (type: 'Scene Craft' | 'Character Dynamics', append: boolean) => {
    setIsLoading(true); setLoadingText(`Geminiが候補を生成中... (${type})`);
    try {
        const res = await api.generateCandidates(state.gemini_key, state.topic_main, state.topic_sub1, state.topic_sub2, state.params, type, append);
        if (res.status === 'success') {
             updateState({ candidates: res.candidates });
             if (type === 'Character Dynamics') setActiveTab(1);
        } else throw new Error(res.message);
    } catch (e: any) { alert("エラーが発生しました: " + (e.message || "通信エラー")); } finally { setIsLoading(false); }
  };

  const updateCandidateAdoption = async (id: number, adopted: boolean) => {
      const newCandidates = state.candidates.map(c => c.id === id ? { ...c, user_adopted: adopted } : c);
      updateState({ candidates: newCandidates });
      await api.updateCandidateAdoption(id, adopted);
  };

  const handleRunCustomOptimization = async () => {
      setIsLoading(true); setLoadingText("多目的最適化を実行中...");
      try {
          const res = await api.runCustomOptimization(state.amplify_token, state.params);
          if (res.status === 'success') {
              updateState({ candidates: res.candidates, optimization_scales: res.scales });
              setPlotData(res.plot_data);
          } else alert(res.message);
      } catch (e) { alert("エラーが発生しました。"); } finally { setIsLoading(false); }
  };

  const handleRunLegacyOptimization = async () => {
      setIsLoading(true); setLoadingText("パラメータ最適化を実行中...");
      try {
          const res = await api.runOptimization(state.amplify_token, state.params);
          if (res.status === 'success') {
              updateState({ candidates: res.candidates, optimization_scales: res.scales });
              setPlotData(res.plot_data);
          } else alert(res.message);
      } catch (e) { alert("エラーが発生しました。"); } finally { setIsLoading(false); }
  };

  const handleGenerateDraft = async (key?: string) => {
    setIsLoading(true); setLoadingText("ドラフト生成中...");
    try {
        const res = await api.generateDraft({ gemini_key: key || state.gemini_key });
        if (res.status === 'success') updateState({ draft_summary: res.summary, draft_article: res.article });
        else alert(res.message);
    } catch (e) { alert("エラー"); } finally { setIsLoading(false); }
  };

  const handleGenerateFinal = async (key?: string) => {
    await api.saveDraftEdit(state.draft_article, state.additional_instruction);
    setIsLoading(true); setLoadingText("最終出力を仕上げ中...");
    try {
        const res = await api.generateFinal({ gemini_key: key || state.gemini_key });
        if (res.status === 'success') updateState({ final_text: res.final_text });
        else alert(res.message);
    } catch(e) { alert("エラー"); } finally { setIsLoading(false); }
  };

  const TabButton = ({ index, icon: Icon, label }: any) => (
      <button onClick={() => setActiveTab(index)} className={`flex items-center gap-2 px-6 py-4 transition-colors relative ${activeTab === index ? 'text-blue-400 bg-slate-800' : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'}`}>
          <Icon className="w-5 h-5" /> <span className="font-bold">{label}</span>
          {activeTab === index && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
      </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 font-sans selection:bg-blue-500/30">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg shadow-lg"><Layout className="w-6 h-6 text-white" /></div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            量子アニーリング駆動型 小説場面執筆支援アプリ <span className="text-xs text-gray-500 font-mono ml-2">Ver.12</span>
                        </h1>
                    </div>
                </div>
                <div className="flex overflow-x-auto no-scrollbar">
                    <TabButton index={0} icon={Settings} label="設定" />
                    <TabButton index={1} icon={Cpu} label="最適化" />
                    <TabButton index={2} icon={PenTool} label="ドラフト" />
                    <TabButton index={3} icon={FileText} label="仕上げ" />
                    <TabButton index={4} icon={ImageIcon} label="挿絵挿入" />
                </div>
            </div>
        </header>

        <main className="container mx-auto py-8 px-4 md:px-6 max-w-5xl">
            {isLoading && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-fadeIn">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div></div>
                    </div>
                    <p className="mt-4 text-blue-200 font-bold tracking-wider animate-pulse">{loadingText}</p>
                </div>
            )}
            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 min-h-[600px]">
                <div className="p-6 md:p-8">
                    {activeTab === 0 && <SettingsTab state={state} updateState={updateState} updateParams={updateParams} onGenerate={handleGenerateCandidates} isLoading={isLoading} />}
                    {activeTab === 1 && <OptimizationTab state={state} updateState={updateState} updateCandidateAdoption={updateCandidateAdoption} runCustomOptimization={handleRunCustomOptimization} runLegacy={handleRunLegacyOptimization} isLoading={isLoading} plotData={plotData} />}
                    {activeTab === 2 && <DraftTab state={state} generateDraft={() => handleGenerateDraft(state.gemini_key)} updateState={updateState} isLoading={isLoading} />}
                    {activeTab === 3 && <FinalTab state={state} generateFinal={() => handleGenerateFinal(state.gemini_key)} isLoading={isLoading} updateState={updateState} />}
                    {activeTab === 4 && <IllustrationTab state={state} updateState={updateState} setIsLoading={setIsLoading} setLoadingText={setLoadingText} />}
                </div>
            </div>
        </main>
    </div>
  );
};
export default App;