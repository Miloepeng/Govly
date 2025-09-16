interface LinkResult {
  title: string;
  content: string;
  url: string;
  similarity?: number;
}

interface LinkCardProps {
  result: LinkResult;
}

export default function LinkCard({ result }: LinkCardProps) {
  return (
    <div
      className="rag-card p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => console.log('Document clicked:', result.title)}
    >
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-medium text-gray-900 line-clamp-2 flex-1">
          📄 {result.title}
        </h5>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          Policy
        </span>
      </div>
      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
        {result.content}
      </p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Relevance: {result.similarity?.toFixed(3)}</span>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 truncate"
        >
          📖 Read Full
        </a>
      </div>
    </div>
  );
}
