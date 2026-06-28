import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ data: [] });
  }

  try {
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Ошибка Deezer API");

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось выполнить поиск" }, { status: 500 });
  }
}