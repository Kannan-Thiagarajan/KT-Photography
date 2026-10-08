import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
export function Pagination({
  page,
  count,
  size,
  base,
}: {
  page: number;
  count: number;
  size: number;
  base: string;
}) {
  const total = Math.ceil(count / size);
  if (total < 2) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link className="button button-outline button-small" href={`${base}?page=${page - 1}`}>
          <ArrowLeft size={14} />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} of {total}
      </span>
      {page < total ? (
        <Link className="button button-outline button-small" href={`${base}?page=${page + 1}`}>
          Next
          <ArrowRight size={14} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
export function pageNumber(value?: string) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 100000 ? n : 1;
}
