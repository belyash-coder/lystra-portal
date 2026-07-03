"use client";

import { useState, ReactNode } from "react";

export default function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = false 
}: { 
  title: string; 
  children: ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-6">
      {/* Мобильная кнопка-переключатель */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden w-full flex items-center justify-between py-3 border-b border-neutral-800 text-xl font-bold text-white hover:text-[#34d399] transition-colors group"
      >
        <span>{title}</span>
        <span className="text-neutral-500 text-2xl leading-none group-hover:text-[#a78bfa] transition-colors">
          {isExpanded ? "−" : "+"}
        </span>
      </button>

      {/* Десктопный заголовок (статичный) */}
      <div className="hidden md:block py-3 border-b border-neutral-800 text-xl font-bold text-white">
        {title}
      </div>

      {/* Контент: на десктопе всегда открыт, на мобилках зависит от состояния */}
      <div 
        className={`grid transition-all duration-300 ease-in-out md:grid-rows-[1fr] md:opacity-100 md:mt-4 ${
          isExpanded ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"
        }`}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}