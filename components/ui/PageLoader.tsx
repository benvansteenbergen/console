export default function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600"></div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
