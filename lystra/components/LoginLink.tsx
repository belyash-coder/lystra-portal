"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LoginLink() {
  const pathname = usePathname();

  return (
    <Link 
      href={`/login?next=${pathname}`} 
      className="text-sm font-bold bg-white text-[#121212] px-4 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
    >
      Войти
    </Link>
  );
}