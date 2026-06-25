type SectionHeaderProps = {
  title: string;
  action?: string;
};

// Title row used above each section, with an optional right-aligned action word.
export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {action ? (
        <button className="text-sm font-semibold text-primary-600 hover:text-primary-700">
          {action}
        </button>
      ) : null}
    </div>
  );
}
