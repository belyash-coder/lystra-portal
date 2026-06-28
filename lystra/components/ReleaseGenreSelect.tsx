'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import genresData from '../data/genres.json' 

interface Props {
  value: string;
  onChange: (genre: string) => void;
}

export default function ReleaseGenreSelect({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Фильтруем жанры на основе ввода и сразу сортируем по алфавиту
  const filteredGenres = genresData
    .filter((genre: string) => genre.toLowerCase().includes(search.toLowerCase()))
    .sort((a: string, b: string) => a.localeCompare(b))

  // Закрываем дропдаун при клике куда-то еще
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Главная кнопка/поле */}
      <div 
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-between w-full bg-[#121212] border ${isOpen ? 'border-[#a78bfa]' : 'border-neutral-800'} rounded-xl p-4 cursor-text transition-colors`}
      >
        {isOpen ? (
          <div className="flex items-center gap-2 w-full">
            <Search className="w-5 h-5 text-neutral-500 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Начни вводить жанр..."
              className="bg-transparent text-white w-full focus:outline-none placeholder:text-neutral-600"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between w-full cursor-pointer">
            <span className={value ? 'text-white' : 'text-neutral-500'}>
              {value || 'Выберите жанр'}
            </span>
            <ChevronDown className="w-5 h-5 text-neutral-500" />
          </div>
        )}
      </div>

      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
          {filteredGenres.length > 0 ? (
            <div className="p-2 space-y-1">
              {filteredGenres.map((genre: string) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => {
                    onChange(genre)
                    setSearch('')
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                    value === genre 
                      ? 'bg-[#a78bfa]/10 text-[#a78bfa] font-medium' 
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {genre}
                  {value === genre && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-neutral-500">
              Ничего не найдено
            </div>
          )}
        </div>
      )}
    </div>
  )
}