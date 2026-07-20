'use client';

import { useRef, useState, type CSSProperties } from 'react';

const inputStyle: CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #333',
  background: '#1a1a1a',
  color: '#fff',
  boxSizing: 'border-box',
};

const toolbarBtnStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '1px solid #333',
  background: '#1a1a1a',
  color: '#fff',
  cursor: 'pointer',
};

interface BroadcastResult {
  total: number;
  sent: number;
  blocked: number;
  failed: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BroadcastPage() {
  const [secret, setSecret] = useState('');
  const [text, setText] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Оборачивает выделенный в textarea текст HTML-тегами форматирования —
  // Bot API поддерживает parse_mode: HTML, поэтому то, что видно в поле
  // (включая сами теги), это и есть итоговая разметка сообщения в Telegram.
  const wrapSelection = (openTag: string, closeTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const next = value.slice(0, selectionStart) + openTag + selected + closeTag + value.slice(selectionEnd);
    setText(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart + openTag.length, selectionEnd + openTag.length);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMediaFile(file);
    setMediaPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSend = async () => {
    if (!secret || !text.trim()) {
      setError('Введите пароль и текст поста');
      return;
    }
    if (!window.confirm('Отправить это сообщение всем пользователям бота?')) return;

    setIsSending(true);
    setError(null);
    setResult(null);
    try {
      let mediaBase64: string | undefined;
      let mediaExt: string | undefined;
      let mediaType: 'photo' | 'video' | undefined;
      if (mediaFile) {
        mediaBase64 = await fileToBase64(mediaFile);
        mediaExt = mediaFile.name.split('.').pop();
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'photo';
      }

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, text, mediaBase64, mediaExt, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Не удалось отправить рассылку');
      } else {
        setResult(data);
      }
    } catch {
      setError('Не удалось отправить рассылку');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#121212', color: '#fff', padding: 32, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Рассылка в Telegram</h1>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#999' }}>Пароль</span>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button type="button" onClick={() => wrapSelection('<b>', '</b>')} style={toolbarBtnStyle} title="Жирный">
            <b>Ж</b>
          </button>
          <button type="button" onClick={() => wrapSelection('<i>', '</i>')} style={toolbarBtnStyle} title="Курсив">
            <i>К</i>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Текст поста... Эмодзи можно вставлять прямо сюда 🎉"
          style={{ ...inputStyle, fontFamily: 'inherit', fontSize: 15, marginBottom: 16, resize: 'vertical' }}
        />

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#999' }}>Картинка или видео (необязательно)</span>
          <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
        </label>

        {mediaPreview &&
          (mediaFile?.type.startsWith('video/') ? (
            <video src={mediaPreview} controls style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 16 }} />
          ) : (
            <img src={mediaPreview} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 16 }} />
          ))}

        <button
          type="button"
          onClick={handleSend}
          disabled={isSending}
          style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: '#a78bfa', color: '#000', fontWeight: 700, cursor: 'pointer' }}
        >
          {isSending ? 'Отправляю…' : 'Отправить всем'}
        </button>

        {error && <p style={{ color: '#f87171', marginTop: 16 }}>{error}</p>}
        {result && (
          <p style={{ color: '#34d399', marginTop: 16 }}>
            Готово: отправлено {result.sent} из {result.total} (заблокировали бота: {result.blocked}, ошибок: {result.failed})
          </p>
        )}
      </div>
    </main>
  );
}
