'use client';

import { useState, useCallback, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { deleteCurrentUser } from '@/lib/actions/profile';

interface EditProfileModalProps {
  profile: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    bio?: string | null;
  };
}

export default function EditProfileModal({ profile }: EditProfileModalProps) {
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndUpload = async () => {
    try {
      setUploading(true);
      if (!imageToCrop || !croppedAreaPixels) return;

      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedImage) throw new Error('Не удалось обрезать изображение');

      // ВАЖНО: Supabase Storage удален. 
      // Временно используем локальный base64 для отображения на фронтенде.
      // Позже нужно настроить загрузку в S3/MinIO через API Route.
      console.warn('Сохранение файлов в БД отключено. Настройте S3 хранилище.');
      setAvatarUrl(imageToCrop); 
      setImageToCrop(null);
    } catch (error) {
      alert('Ошибка при загрузке фото');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      // ВАЖНО: Supabase удален.
      // В будущем здесь нужно вызвать Server Action для обновления Prisma БД.
      console.warn('Сохранение профиля временно отключено (Supabase удален).');

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      alert('Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    const confirmed = confirm(
      'ВНИМАНИЕ! Вы уверены, что хотите навсегда удалить свой профиль LYSTRA? Это действие сотрет все ваши отзывы, коллекции и настройки без возможности восстановления.'
    );
    
    if (!confirmed) return;

    startDeleteTransition(async () => {
      const res = await deleteCurrentUser();
      if (res?.error) {
        alert(res.error);
      } else {
        router.push('/login');
        router.refresh();
      }
    });
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/90 p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] border border-neutral-800 rounded-2xl w-full max-w-md p-6 relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#a78bfa]"></span>
          Настройки профиля
        </h3>

        {imageToCrop ? (
          <div className="space-y-4">
            <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            
            <div>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[#a78bfa]"/>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setImageToCrop(null)} className="px-4 py-2 text-sm text-neutral-400 hover:text-white cursor-pointer">Отмена</button>
              <button onClick={handleCropAndUpload} disabled={uploading} className="px-5 py-2 bg-[#a78bfa] text-white font-bold text-sm rounded-xl hover:bg-[#a78bfa]/80 cursor-pointer disabled:opacity-50">
                {uploading ? 'Загрузка...' : 'Обрезать'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-neutral-800">
              <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden relative flex-shrink-0 border border-neutral-700">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Превью" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">Нет</div>
                )}
              </div>
              <div className="flex-grow">
                <label className="block text-xs font-medium text-neutral-400 mb-1">Аватар профиля</label>
                <input type="file" accept="image/*" onChange={onFileChange} className="block w-full text-xs text-neutral-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#a78bfa]/10 file:text-[#a78bfa] hover:file:bg-[#a78bfa]/20 file:cursor-pointer"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Имя пользователя</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#121212] border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a78bfa]"/>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">О себе</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full bg-[#121212] border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a78bfa] resize-none"/>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-neutral-800 w-full">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletePending}
                className="text-xs md:text-sm text-neutral-500 hover:text-red-400 font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeletePending ? 'Удаление...' : 'Удалить профиль'}
              </button>

              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-white cursor-pointer transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  disabled={saving || uploading || isDeletePending} 
                  className="px-5 py-2 bg-[#34d399] text-[#121212] font-bold text-sm rounded-xl hover:bg-[#34d399]/80 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="mt-4 md:mt-0 px-5 py-2 border border-[#a78bfa]/40 text-[#a78bfa] rounded-xl font-medium text-sm hover:bg-[#a78bfa]/10 transition-colors w-fit mx-auto md:mx-0 flex-shrink-0 cursor-pointer">
        Редактировать профиль
      </button>
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}