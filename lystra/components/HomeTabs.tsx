"use client";

import { useState } from "react";

interface HomeTabsProps {
  globalReleasesContent: React.ReactNode;
  indieSceneContent: React.ReactNode;
}

export default function HomeTabs({ globalReleasesContent, indieSceneContent }: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<"global" | "indie">("global");

  return (
    <div className="space-y-8">
      {/* Кнопки переключения вкладок */}
      <div className="flex border-b border-neutral-800 gap-6">
        <button
          onClick={() => setActiveTab("global")}
          className={`pb-4 text-lg font-bold transition-all relative ${
            activeTab === "global"
              ? "text-[#a78bfa]"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Мировые релизы
          {activeTab === "global" && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#a78bfa]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("indie")}
          className={`pb-4 text-lg font-bold transition-all relative ${
            activeTab === "indie"
              ? "text-[#34d399]"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Независимая сцена
          {activeTab === "indie" && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#34d399]" />
          )}
        </button>
      </div>

      {/* Отображение выбранного контента */}
      <div className="transition-opacity duration-200">
        {activeTab === "global" ? globalReleasesContent : indieSceneContent}
      </div>
    </div>
  );
}
