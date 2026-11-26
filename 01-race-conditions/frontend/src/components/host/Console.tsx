interface Props {
  children: string;
}

export function Console({ children }: Props) {
  return (
    <pre className="min-h-10 rounded-md border bg-muted p-3 font-mono text-xs break-words whitespace-pre-wrap">
      {children}
    </pre>
  );
}
