import React from 'react';
import { AppState } from '../types';
import * as api from '../services/api';
import { Image as ImageIcon, Download } from 'lucide-react';

interface Props {
  state: AppState; updateState: (updates: Partial<AppState>) => void;
  setIsLoading: (loading: boolean) => void; setLoadingText: (text: string) => void;
}

export const IllustrationTab: React.FC<Props> = ({ state, updateState, setIsLoading, setLoadingText }) => {
  const handleGenerateImages = async () => {
      // 念のため、最終出力が生成されているか確認
      if (!state.final_text) { alert("先に「仕上げ」タブで最終出力を生成してください。"); return; }
      
      setIsLoading(true); setLoadingText(`ランダムに6枚の挿絵を生成中...`);
      try {
          // スタイルやアイテムの指定は使わないため、空文字を渡します
          const res = await api.generateIllustrationImages(
              state.gemini_key, 
              "", // scene
              "", // style
              "", // custom
              state.final_text,
              ""  // style_choice
          );
          if (res.status === 'success') updateState({ generated_images: res.images });
          else alert("画像生成エラー: " + res.message);
      } catch(e: any) { alert("通信エラー: " + e.message); } finally { setIsLoading(false); }
  };

  const handleDownloadImage = (base64Str: string, index: number) => {
      const link = document.createElement('a'); link.href = `data:image/jpeg;base64,${base64Str}`; link.download = `illustration_${index + 1}.jpg`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="animate-fadeIn">
      {/* 上部ヘッダーと生成ボタン */}
      <div className="flex justify-between items-center mb-6">
          <h5 className="text-xl font-bold text-gray-200">挿絵挿入</h5>
          <button 
              onClick={handleGenerateImages} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center transition"
          >
              <ImageIcon className="w-5 h-5 mr-2" />ランダムに6枚生成
          </button>
      </div>

      {/* 画像表示エリア（1カラム） */}
      <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 flex flex-col min-h-[500px]">
          <div className="mb-4 border-b border-slate-700 pb-2">
              <h6 className="font-bold text-gray-300">生成された画像（6枚）</h6>
              <p className="text-xs text-gray-400 mt-1">「ランダムに6枚生成」ボタンを押すと画像が表示されます</p>
          </div>
          
          <div className="flex-grow flex flex-col gap-4 overflow-y-auto pr-2">
              {state.generated_images.length === 0 ? (
                  <div className="flex-grow flex items-center justify-center text-gray-500 text-sm">画像はまだ生成されていません</div>
              ) : (
                  // 画面幅に応じて1列〜3列に可変するグリッドレイアウトで6枚を綺麗に並べます
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {state.generated_images.map((item, idx) => (
                          <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-600 relative group flex flex-col justify-between shadow-md hover:shadow-lg transition">
                              {/* aspect-square で画像を正方形に切り抜いて統一感を出します */}
                              <img src={`data:image/jpeg;base64,${item.image}`} alt={`Generated ${idx}`} className="w-full aspect-square object-cover rounded mb-3" />
                              <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-purple-300">💎 {item.style}</span>
                                  <button 
                                    onClick={() => handleDownloadImage(item.image, idx)} 
                                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded transition"
                                  >
                                      <Download className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};