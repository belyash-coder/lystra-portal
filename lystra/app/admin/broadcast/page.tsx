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

const MAX_MEDIA_ITEMS = 10;

interface BroadcastResult {
  total: number;
  sent: number;
  blocked: number;
  failed: number;
}

interface MediaEntry {
  file: File;
  previewUrl: string;
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
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([]);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setMediaEntries((prev) => {
      const combined = [...prev, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
      if (combined.length > MAX_MEDIA_ITEMS) {
        setError(`Telegram позволяет прикрепить не больше ${MAX_MEDIA_ITEMS} файлов в одном посте — лишние не добавлены`);
      }
      return combined.slice(0, MAX_MEDIA_ITEMS);
    });
    e.target.value = '';
  };

  const removeMediaEntry = (index: number) => {
    setMediaEntries((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
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
      const media = await Promise.all(
        mediaEntries.map(async ({ file }) => ({
          base64: await fileToBase64(file),
          ext: file.name.split('.').pop(),
          type: file.type.startsWith('video/') ? ('video' as const) : ('photo' as const),
        }))
      );

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, text, media }),
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
          <span style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#999' }}>
            Картинки/видео (необязательно, можно выбрать сразу несколько — до {MAX_MEDIA_ITEMS})
          </span>
          <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} />
        </label>

        {mediaEntries.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {mediaEntries.map((entry, i) => (
              <div key={i} style={{ position: 'relative', width: 96, height: 96 }}>
                {entry.file.type.startsWith('video/') ? (
                  <video src={entry.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <img src={entry.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                )}
                <button
                  type="button"
                  onClick={() => removeMediaEntry(i)}
                  title="Убрать"
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    border: 'none',
                    background: '#f87171',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    lineHeight: '24px',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

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
