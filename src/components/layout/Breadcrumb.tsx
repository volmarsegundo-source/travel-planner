import { Link } from "@/i18n/navigation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Label for mobile back link (e.g., "Back to {name}") */
  backLabel?: string;
}

export function Breadcrumb({ items, backLabel }: BreadcrumbProps) {
  // Find the penultimate item for mobile back link
  const backItem = items.length >= 2 ? items[items.length - 2] : null;

  return (
    <>
      {/* Desktop: full breadcrumb trail */}
      <nav aria-label="Breadcrumb" className="mb-6 hidden sm:block">
        <ol className="flex items-center gap-1.5 text-sm">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={index} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span aria-hidden="true" className="text-muted-foreground">/</span>
                )}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-foreground">
                    {item.label}
                  </span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className="truncate max-w-[25ch] text-muted-foreground hover:text-foreground transition-colors"
                    title={item.label}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{item.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile: compact back link */}
      {backItem?.href && (
        <nav aria-label="Breadcrumb" className="mb-6 sm:hidden">
          <Link
            href={backItem.href}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {backLabel ?? backItem.label}
          </Link>
        </nav>
      )}
    </>
  );
}
