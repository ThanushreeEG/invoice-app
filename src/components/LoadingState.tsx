export default function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3" role="status" aria-live="polite">
      <div className="loading-spinner" />
      <div className="text-sm text-gray-500 font-medium">{message}</div>
    </div>
  );
}
