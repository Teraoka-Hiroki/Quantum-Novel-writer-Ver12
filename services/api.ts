import { AppState } from '../types';

const API_BASE = '/api';

export const generateCandidates = async (
  gemini_key: string, topic_main: string, topic_sub1: string, topic_sub2: string,
  params: AppState['params'], target_type?: string, append: boolean = false
) => {
  const res = await fetch(`${API_BASE}/generate_candidates`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gemini_key, topic_main, topic_sub1, topic_sub2, params, target_type, append }),
  });
  return res.json();
};

export const updateCandidateAdoption = async (id: number, adopted: boolean) => {
  const res = await fetch(`${API_BASE}/update_adoption`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, adopted }),
  });
  return res.json();
};

export const runOptimization = async (amplify_token: string, params: AppState['params']) => {
  const res = await fetch(`${API_BASE}/optimize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amplify_token, params }),
  });
  return res.json();
};

export const runCustomOptimization = async (amplify_token: string, params: AppState['params']) => {
  const res = await fetch(`${API_BASE}/custom_optimize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amplify_token, params }),
  });
  return res.json();
};

export const generateDraft = async (data?: { gemini_key?: string }) => {
  const res = await fetch(`${API_BASE}/generate_draft`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  });
  return res.json();
};

export const saveDraftEdit = async (article: string, instruction: string) => {
  const res = await fetch(`${API_BASE}/save_draft_edit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article, instruction }),
  });
  return res.json();
};

export const generateFinal = async (data?: { gemini_key?: string }) => {
  const res = await fetch(`${API_BASE}/generate_final`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  });
  return res.json();
};

export const generateIllustrationOptions = async (gemini_key: string, final_text: string) => {
  const res = await fetch(`${API_BASE}/illustration/options`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gemini_key, final_text }),
  });
  return res.json();
};

export const generateIllustrationImages = async (gemini_key: string, scene: string, style: string, custom: string, final_text: string, style_choice?: string) => {
  const res = await fetch(`${API_BASE}/illustration/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gemini_key, scene, style, custom, final_text, style_choice: style_choice || 'リアリスティック' }),
  });
  return res.json();
};

export const uploadSettings = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/settings/upload`, {
        method: 'POST',
        body: formData
    });
    return res.json();
};