"use client";

import { useEffect, useState } from "react";
// 1. Импортируем компонент под временным именем
import OriginalReactPlayer from "react-player";

// 2. Превращаем его в any. Теперь TypeScript вообще не будет проверять его пропсы!
const ReactPlayer = OriginalReactPlayer as any;

interface StreamPlayerProps {
  url: string;
}

export default function StreamPlayer({ url }: StreamPlayerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-[120px] w-full bg-neutral-800 animate-pulse rounded-lg mt-4" />;
  }

  return (
    <div className="rounded-lg overflow-hidden border border-neutral-800 mt-4 flex justify-center bg-black">
      <ReactPlayer 
        url={url} 
        width="100%" 
        height="120px" 
        controls={true}
      />
    </div>
  );
}