export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-muted ${className ?? 'h-24 w-full'}`} />
  );
}
