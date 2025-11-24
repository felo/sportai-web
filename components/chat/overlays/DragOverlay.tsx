export function DragOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#7ADB8F]/20 dark:bg-[#025940]/30 pointer-events-none">
      <div 
        className="bg-white dark:bg-gray-800 p-8"
        style={{
          borderRadius: "var(--radius-3)",
          border: "2px solid white",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1), 0 0 10px rgba(122, 219, 143, 0.2), 0 0 20px rgba(122, 219, 143, 0.6), 0 0 40px rgba(122, 219, 143, 0.4), 0 4px 16px rgba(122, 219, 143, 0.5)",
        }}
      >
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-[#7ADB8F] mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p 
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2"
            style={{ paddingLeft: "var(--space-2)" }}
          >
            Drop video file here
          </p>
          <p 
            className="text-sm text-gray-600 dark:text-gray-400"
            style={{ paddingLeft: "var(--space-2)" }}
          >
            Release to upload and analyze
          </p>
        </div>
      </div>
    </div>
  );
}

