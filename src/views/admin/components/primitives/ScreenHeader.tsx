interface ScreenHeaderProps {
  title: string;
  subtitle: string;
  large?: boolean;
  children?: React.ReactNode;
  /**
   * Slot opcional entre el título y el subtítulo (e.g. selector de sucursal sutil).
   * Si null/undefined no renderiza línea extra.
   */
  meta?: React.ReactNode;
}

export default function ScreenHeader({ title, subtitle, large, children, meta }: ScreenHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h1
          className={`text-xl font-bold text-zinc-900 dark:text-zinc-100${large ? " tracking-tight md:text-2xl" : ""}`}
        >
          {title}
        </h1>
        {children}
      </div>
      {meta && <div className="mt-0.5">{meta}</div>}
      <p className={`mt-0.5 text-sm text-zinc-500${large ? " dark:text-zinc-400" : ""}`}>
        {subtitle}
      </p>
    </div>
  );
}
