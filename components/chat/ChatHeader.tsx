interface ChatHeaderProps {
  onClear: () => void;
  messageCount: number;
}

export function ChatHeader({ onClear, messageCount }: ChatHeaderProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-semibold">SportAI Web</h1>
      {messageCount > 0 && (
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center gap-2"
          title="Clear conversation"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>Clear</span>
        </button>
      )}
    </div>
  );
}

