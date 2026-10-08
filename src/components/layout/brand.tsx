import Image from 'next/image';
import Link from 'next/link';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="KT Photography home">
      <Image src="/assets/logos/mark.webp" alt="" width={37} height={37} />
      <span>
        KT PHOTOGRAPHY<small>CAPTURING MOMENTS</small>
      </span>
    </Link>
  );
}
