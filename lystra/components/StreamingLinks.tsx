const STREAMING_SERVICES = [
  {
    name: 'Spotify',
    color: '#1DB954',
    href: (q: string) => `https://open.spotify.com/search/${q}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.72 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
  {
    name: 'Яндекс.Музыка',
    color: '#FFCC00',
    href: (q: string) => `https://music.yandex.ru/search?text=${q}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 0c.4 3.6 1.1 6.3 2.2 8.1 1.5 2.5 3.9 4.2 7.2 5.1-3.1.5-5.5 1.6-7.2 3.4-1.5 1.6-2.4 3.9-2.7 7-.5-3.4-1.4-6-2.7-7.6C7.2 14.2 4.7 13 1 12.3c3.5-.6 6-1.8 7.6-3.7C10 6.9 11.2 4.1 12 0z" />
      </svg>
    ),
  },
];

interface StreamingLinksProps {
  artist: string;
  title: string;
  className?: string;
}

export default function StreamingLinks({ artist, title, className = '' }: StreamingLinksProps) {
  const query = encodeURIComponent(`${artist} ${title}`);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-zinc-500 font-medium mr-1">Искать также на:</span>
      {STREAMING_SERVICES.map((service) => (
        <a
          key={service.name}
          href={service.href(query)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: service.color, borderColor: `${service.color}4D` }}
          className="flex items-center gap-1.5 text-xs font-semibold pl-2 pr-3 py-1.5 rounded-full border hover:brightness-125 transition-all"
        >
          <span className="w-4 h-4 flex-shrink-0">{service.icon}</span>
          {service.name}
        </a>
      ))}
    </div>
  );
}
