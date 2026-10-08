import type { Metadata } from 'next';
import './fonts.css';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'KT Photography · Capturing Moments, Crafting Memories',
    template: '%s · KT Photography',
  },
  description:
    'Explore KT Photography collections for weddings, ROM, celebrations, convocation and portraits. Photography packages from RM300. Connect with Kannan and access your private gallery.',
  openGraph: {
    title: 'KT Photography',
    description: 'Capturing Moments | Crafting Memories',
    images: [{ url: '/assets/images/kt-photo.png', width: 1774, height: 887 }],
    type: 'website',
  },
  icons: { icon: '/assets/logos/mark.webp' },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
