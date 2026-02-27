import json
import warnings
import time
import base64
from typing import List, Dict, Any

try:
    from amplify import VariableGenerator, FixstarsClient, solve
    HAS_AMPLIFY = True
except: HAS_AMPLIFY = False

warnings.filterwarnings("ignore")

class DraftItem:
    def __init__(self, id, text, type, relevance, attributes, selected=False, user_rating=0, user_adopted=False):
        self.id = id
        self.text = text
        self.type = type
        self.relevance = float(relevance)
        self.attributes = attributes if isinstance(attributes, dict) else {}
        self.selected = selected
        self.user_rating = int(user_rating)
        self.user_adopted = user_adopted

    def to_dict(self):
        return {
            "id": self.id, "text": self.text, "type": self.type,
            "relevance": self.relevance, "attributes": self.attributes,
            "selected": self.selected, "user_rating": self.user_rating,
            "user_adopted": self.user_adopted
        }
    
    @staticmethod
    def from_dict(data):
        return DraftItem(
            data.get("id", 0), 
            data.get("text", ""), 
            data.get("type", "Unknown"), 
            data.get("relevance", 0.5), 
            data.get("attributes", {}), 
            data.get("selected", False), 
            data.get("user_rating", 0),
            data.get("user_adopted", False)
        )

class LogicHandler:
    
    @staticmethod
    def _safe_generate(api_key, prompt, retries=3):
        """新しいSDK(google-genai)を使って安全にテキストを生成します"""
        try:
            from google import genai
        except ImportError:
            raise Exception("新しいライブラリ 'google-genai' がインストールされていません。ターミナルで `pip install google-genai` を実行してください。")

        client = genai.Client(api_key=api_key)
        # 安定したモデルから順に試行する
        models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
        last_error = ""

        for model_name in models:
            for attempt in range(retries):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    return response.text
                except Exception as e:
                    err_str = str(e).lower()
                    if "404" in err_str or "not found" in err_str:
                        last_error = f"[{model_name}] は現在の環境で利用できません。"
                        break # このモデルは諦めて次のモデルへ
                    if "429" in err_str or "quota" in err_str:
                        time.sleep(3)
                        continue
                    if attempt < retries - 1:
                        time.sleep(2)
                        continue
                    raise Exception(f"APIエラー ({model_name}): {str(e)}")
        raise Exception(f"利用可能なGeminiモデルが見つかりません。詳細: {last_error}")

    @staticmethod
    def generate_candidates_api(api_key, topic_main, topic_sub1, topic_sub2, params, target_type=None):
        p_desc = params.get('p_desc_style', 0.5)
        p_pers = params.get('p_perspective', 0.5)
        p_sens = params.get('p_sensory', 0.5)
        p_thou = params.get('p_thought', 0.5)
        p_tens = params.get('p_tension', 0.5)
        p_real = params.get('p_reality', 0.5)
        
        p_c_cnt = params.get('p_char_count', 0.2)
        p_c_men = params.get('p_char_mental', 0.5)
        p_c_bel = params.get('p_char_belief', 0.5)
        p_c_tru = params.get('p_char_trauma', 0.0)
        p_c_voi = params.get('p_char_voice', 0.5)

        if target_type == "Scene Craft":
            instruction = f"""
            「Scene Craft」（シーン描写）の執筆ブロックを１５個生成してください。各ブロック記事は１２０字程度にしてください。
            【重要方針】
            以下のパラメータ（0.0=弱い/少ない 〜 1.0=強い/多い）を反映してください：
            - 描写の密度(desc_style): {p_desc}
            - 視点の主観性(perspective): {p_pers}
            - 感覚的表現(sensory): {p_sens}
            - 内面的思考(thought): {p_thou}
            - 緊張感(tension): {p_tens}
            - 現実味(reality): {p_real}
            """
            json_format = '{ "type": "Scene Craft", "text": "...", "scores": { "relevance": 0.5, "desc_style": 0.5, "perspective": 0.5, "sensory": 0.5, "thought": 0.5, "tension": 0.5, "reality": 0.5 } }'
        elif target_type == "Character Dynamics":
            instruction = f"""
            「Character Dynamics」（キャラクター造形）の執筆ブロックを１５個生成してください。各ブロック記事は１２０字程度にしてください。
            【重要方針】
            以下のパラメータ（0.0=弱い/少ない 〜 1.0=強い/多い）を反映してください：
            - 登場人数(char_count): {p_c_cnt}
            - 心理描写の深さ(char_mental): {p_c_men}
            - 信念の強さ(char_belief): {p_c_bel}
            - 過去のトラウマの影響(char_trauma): {p_c_tru}
            - 口調の特徴度(char_voice): {p_c_voi}
            """
            json_format = '{ "type": "Character Dynamics", "text": "...", "scores": { "relevance": 0.5, "char_count": 0.2, "char_mental": 0.5, "char_belief": 0.5, "char_trauma": 0.0, "char_voice": 0.5 } }'
        else:
            instruction = "「Scene Craft」と「Character Dynamics」をそれぞれ生成してください。"
            json_format = '{ "type": "...", "text": "...", "scores": { ... } }'

        prompt = f"""
        以下の設定に基づいて、日本語で執筆ブロックを生成してください。
        
        メイン設定: {topic_main}
        サブ設定1: {topic_sub1}
        サブ設定2: {topic_sub2}
        
        指示: {instruction}
        
        以下の有効なJSONリストのみを返してください。
        [
          {json_format},
          ...
        ]
        """
        
        raw_text = LogicHandler._safe_generate(api_key, prompt)
        text = raw_text.replace("```json", "").replace("```", "").strip()
        try:
            start, end = text.find("["), text.rfind("]")
            if start == -1 or end == -1:
                raise Exception("AIがリスト形式のJSONを返しませんでした。")
            data = json.loads(text[start:end+1])
            
            return [DraftItem(i, item.get("text", ""), item.get("type", "Unknown"), item.get("scores", {}).get("relevance", 0.5), item.get("scores", {})) for i, item in enumerate(data)]
        except Exception as e:
            error_preview = raw_text[:100] if isinstance(raw_text, str) else ""
            raise Exception(f"データの解析に失敗しました。({str(e)}) / AIの返答: {error_preview}...")

    @staticmethod
    def _construct_param_objective(q, candidates, params):
        h_param_diff = 0
        target_s = { k: params['p_'+k] for k in ["desc_style", "perspective", "sensory", "thought", "tension", "reality"] }
        target_c = { k: params['p_'+k] for k in ["char_count", "char_mental", "char_belief", "char_trauma", "char_voice"] }
        
        for i, c in enumerate(candidates):
            cost_i = 0
            t = target_s if c.type == "Scene Craft" else target_c
            for k, tv in t.items():
                val = float(c.attributes.get(k, 0.5))
                cost_i += (val - float(tv)) ** 2
            h_param_diff += float(cost_i) * q[i]
            
        return h_param_diff

    @staticmethod
    def _construct_relevance_objective(q, candidates):
        h_rel = 0
        for i, c in enumerate(candidates):
            h_rel += (1.0 - float(c.relevance)) * q[i]
        return h_rel
    
    @staticmethod
    def _construct_adoption_objective(q, candidates):
        h_adopt = 0
        for i, c in enumerate(candidates):
            if c.user_adopted:
                h_adopt += (1 - q[i])
        return h_adopt

    @staticmethod
    def _solve_multi_stage(token, model_objs, model_constraints, q, candidates, target_length, weights):
        if not candidates:
            raise Exception("最適化する候補がありません。")

        client = FixstarsClient()
        client.token = token
        
        def get_val(values, variable):
            if values is None: return 0
            try: return variable.evaluate(values)
            except: return 0
        
        client.parameters.timeout = 5000 
        scales = {}
        values_step1 = None
        
        if hasattr(model_constraints, 'evaluate'): 
            result_step1 = solve(model_constraints, client)
            if hasattr(result_step1, 'best'):
                values_step1 = result_step1.best.values
            elif isinstance(result_step1, list) and len(result_step1) > 0:
                values_step1 = result_step1[0].values

            if values_step1 is not None:
                for key, obj in model_objs.items():
                    if hasattr(obj, 'evaluate'):
                        scales[key] = max(abs(obj.evaluate(values_step1)), 0.01)
                    else:
                        scales[key] = 1.0
            else:
                for key in model_objs.keys(): scales[key] = 1.0
        else:
            for key in model_objs.keys(): scales[key] = 1.0
            
        client.parameters.timeout = 10000 
        w_constraint = weights.get('constraint', 1.0)
        model_final = model_constraints * w_constraint
        
        for key, obj in model_objs.items():
            model_final += (obj / scales.get(key, 1.0)) * weights.get(key, 1.0)
            
        result = solve(model_final, client)
        
        plot_data = []
        try:
            for sol in result:
                t = float(sol.time.total_seconds()) if hasattr(sol, 'time') else 0.0
                v = float(sol.objective if hasattr(sol, 'objective') else sol.energy)
                plot_data.append({"time": t, "value": v})
        except:
            pass

        values = None
        if hasattr(result, 'best'): values = result.best.values
        elif isinstance(result, list) and len(result) > 0: values = result[0].values
        
        updated_candidates = []
        for i, c in enumerate(candidates):
            c.selected = (get_val(values, q[i]) > 0.5)
            updated_candidates.append(c.to_dict())
            
        return updated_candidates, plot_data, { **scales, "constraint": 1.0 }

    @staticmethod
    def run_parameter_optimization_multi(token, candidates_dict, params):
        if not HAS_AMPLIFY: raise Exception("Amplify missing")
        candidates = [DraftItem.from_dict(d) for d in candidates_dict]
        gen = VariableGenerator()
        q = gen.array("Binary", len(candidates))
        
        h_param = LogicHandler._construct_param_objective(q, candidates, params)
        h_rel = LogicHandler._construct_relevance_objective(q, candidates)
        
        current_len_poly = sum(len(c.text) * q[i] for i, c in enumerate(candidates))
        target = float(params['length'])
        h_len_penalty = 0.001 * (current_len_poly - target)**2
        
        weights = { "relevance": 10.0, "param": 5.0, "constraint": 1.0 }
        
        return LogicHandler._solve_multi_stage(
            token, 
            {"relevance": h_rel, "param": h_param}, 
            h_len_penalty, 
            q, candidates, target, weights
        )

    @staticmethod
    def run_custom_optimization(token, candidates_dict, params):
        if not HAS_AMPLIFY: raise Exception("Amplify missing")
        candidates = [DraftItem.from_dict(d) for d in candidates_dict]
        gen = VariableGenerator()
        q = gen.array("Binary", len(candidates))
        
        h_rel = LogicHandler._construct_relevance_objective(q, candidates)
        h_param = LogicHandler._construct_param_objective(q, candidates, params)
        h_adopt = LogicHandler._construct_adoption_objective(q, candidates)
        
        current_len_poly = sum(len(c.text) * q[i] for i, c in enumerate(candidates))
        target = float(params['length'])
        h_len_penalty = 0.001 * (current_len_poly - target)**2
        
        weights = { "relevance": 10.0, "param": 5.0, "adopt": 100.0, "constraint": 1.0 }
        
        return LogicHandler._solve_multi_stage(
            token,
            {"relevance": h_rel, "param": h_param, "adopt": h_adopt},
            h_len_penalty,
            q, candidates, target, weights
        )

    @staticmethod
    def generate_draft(api_key, selected, params):
        materials = "\n".join([f"[{item['type']}] {item['text']}" for item in selected])
        target_len = params.get('length', 500)
        
        prompt = f"""
        以下の素材を使用して、小説の構成を作成してください。
        
        【素材】
        {materials}
        
        【指示】
        1. まず「プロットのあらすじ（200文字程度）」を作成してください。
        2. 次に、実際の「小説のシーン（{target_len}文字程度）」を執筆してください。
        
        【出力形式】
        ===SUMMARY===
        (あらすじ)
        ===ARTICLE===
        (本文)
        """
        raw_text = LogicHandler._safe_generate(api_key, prompt)
        if "===SUMMARY===" in raw_text and "===ARTICLE===" in raw_text:
            parts = raw_text.split("===ARTICLE===")
            summary = parts[0].split("===SUMMARY===")[1].strip()
            article = parts[1].strip()
            return summary, article
        return "エラー", raw_text

    @staticmethod
    def generate_final(api_key, draft, instr):
        prompt = f"以下の指示に基づいて推敲してください: {instr}\n文章:\n{draft}"
        return LogicHandler._safe_generate(api_key, prompt)

    @staticmethod
    def generate_illustration_options(api_key, final_text):
        prompt = f"""
        以下の小説の最終出力から、挿絵の場面の候補を5つ、スタイルの候補を5つ提案してください。
        JSON形式で出力してください。Markdownのコードブロックは含めないでください。
        {{
            "scenes": ["場面1", "場面2", "場面3", "場面4", "場面5"],
            "styles": ["スタイル1", "スタイル2", "スタイル3", "スタイル4", "スタイル5"]
        }}
        
        小説本文:
        {final_text}
        """
        raw_text = LogicHandler._safe_generate(api_key, prompt)
        text = raw_text.replace("```json", "").replace("```", "").strip()
        try:
            start, end = text.find("{"), text.rfind("}")
            data = json.loads(text[start:end+1])
            return data.get("scenes", []), data.get("styles", [])
        except Exception as e:
            raise Exception(f"生成データの解析に失敗しました。({str(e)})")

    @staticmethod
    def generate_images(api_key, scene, style, custom, final_text, style_choice='リアリスティック'):
        """ランダムに6枚の異なる画像を生成"""
        import requests
        from urllib.parse import quote
        import random
        
        try:
            # ランダムシード用のキー
            random_seed = random.randint(1000, 9999)
            
            # 6つの異なる検索テーマ（多様性確保）
            search_queries = [
                "beautiful landscape nature scenery",
                "abstract artistic design pattern",
                "vibrant colorful composition",
                "dramatic atmospheric scene",
                "peaceful serene environment",
                "dynamic energetic visual"
            ]
            
            results = []  # {image: base64, style: style_name} のリスト
            
            print(f"\n【ランダム多様生成】6枚を異なるテーマで取得中...")
            
            for query_idx, base_query in enumerate(search_queries):
                if len(results) >= 6:
                    break
                
                print(f"\n  {query_idx + 1}/6: '{base_query}' を検索中...")
                
                image_found = False
                
                # Unsplash で検索
                try:
                    api_url = "https://api.unsplash.com/search/photos"
                    params = {
                        "query": base_query,
                        "per_page": 1,
                        "page": (random_seed + query_idx) % 10,  # ランダムページ
                        "client_id": "mKL0-vfpPxVw1OW1_l9L03iyAeVdG6lCNUvYbv4ZjJ8"
                    }
                    response = requests.get(api_url, params=params, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("results") and len(data["results"]) > 0:
                            image_url = data["results"][0]["urls"]["regular"]
                            img_response = requests.get(image_url, timeout=10)
                            if img_response.status_code == 200 and len(img_response.content) > 1000:
                                b64 = base64.b64encode(img_response.content).decode('utf-8')
                                results.append({"image": b64, "style": f"タイプ {query_idx + 1}"})
                                print(f"    ✓ Unsplash で取得")
                                image_found = True
                except Exception as e:
                    print(f"    Unsplash エラー: {str(e)}")
                
                # Unsplash で見つからない場合は Lexica を試す
                if not image_found:
                    try:
                        api_url = f"https://lexica.art/api/v1/search?q={quote(base_query)}"
                        response = requests.get(api_url, timeout=10)
                        
                        if response.status_code == 200:
                            data = response.json()
                            if data.get("images") and len(data["images"]) > 0:
                                # ランダムインデックス選択
                                idx = random_seed % len(data["images"])
                                image_url = data["images"][idx]["src"]
                                img_response = requests.get(image_url, timeout=10)
                                if img_response.status_code == 200 and len(img_response.content) > 1000:
                                    b64 = base64.b64encode(img_response.content).decode('utf-8')
                                    results.append({"image": b64, "style": f"タイプ {query_idx + 1}"})
                                    print(f"    ✓ Lexica で取得")
                                    image_found = True
                    except Exception as e:
                        print(f"    Lexica エラー: {str(e)}")
                
                # 両方失敗の場合、Picsum フォールバック
                if not image_found:
                    try:
                        seed = random_seed + query_idx * 100
                        image_url = f"https://picsum.photos/512/512?random={seed}"
                        response = requests.get(image_url, timeout=10, allow_redirects=True)
                        
                        if response.status_code == 200 and len(response.content) > 1000:
                            b64 = base64.b64encode(response.content).decode('utf-8')
                            results.append({"image": b64, "style": f"タイプ {query_idx + 1}"})
                            print(f"    ✓ Picsum で取得")
                    except Exception as e:
                        print(f"    Picsum エラー: {str(e)}")
            
            if results:
                print(f"\n✓ {len(results)} 枚の異なる画像を生成しました")
                return results
            else:
                raise Exception(
                    f"申し訳ありません。現在、画像取得に失敗しています。\n"
                    f"以下をお試しください：\n"
                    f"1. インターネット接続を確認\n"
                    f"2. 数秒待ってから再度「挿絵生成」ボタンをクリック"
                )
            
        except Exception as e:
            raise Exception(f"画像生成エラー: {str(e)}")