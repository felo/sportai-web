export function DragOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#74BC9C]/20 dark:bg-[#4A8066]/30 pointer-events-none">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border-4 border-dashed border-[#74BC9C]">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-[#74BC9C] mb-4"
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
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Drop video file here
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Release to upload and analyze
          </p>
        </div>
      </div>
    </div>
  );
}

