import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  action?: string;
  actionHref?: string;
};

export function SectionHeader({ title, action, actionHref }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {action ? (
        actionHref ? (
          <Link
            href={actionHref}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            {action}
          </Link>
        ) : (
          <button className="text-sm font-semibold text-primary-600 hover:text-primary-700">
            {action}
          </button>
        )
      ) : null}
    </div>
  );
}
