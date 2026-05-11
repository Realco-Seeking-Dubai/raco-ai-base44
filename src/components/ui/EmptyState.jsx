export default function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        {body && <div className="text-sm text-muted-foreground mt-1 max-w-xs">{body}</div>}
      </div>
    </div>
  );
}