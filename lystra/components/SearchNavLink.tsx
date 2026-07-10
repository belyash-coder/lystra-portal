"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchNavLink({ className, onClick }: { className?: string; onClick?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [lastRoute, setLastRoute] = useState("/search");

  useEffect(() => {
    // Безопасная проверка: используем ?. чтобы избежать ошибок, если pathname равен null
    if (pathname === "/search" || pathname?.startsWith("/artist/") || pathname?.startsWith("/album/")) {
      const currentUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      setLastRoute(currentUrl);
      sessionStorage.setItem("lystra_search_tab_history", currentUrl);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const saved = sessionStorage.getItem("lystra_search_tab_history");
    if (saved) setLastRoute(saved);
  }, []);

  // Тоже добавляем безопасную проверку
  const isActiveTab = pathname === "/search" || pathname?.startsWith("/artist/") || pathname?.startsWith("/album/");
  const targetHref = isActiveTab ? "/search" : lastRoute;

  return (
    <Link href={targetHref} className={className} onClick={onClick}>
      Поиск
    </Link>
  );
}