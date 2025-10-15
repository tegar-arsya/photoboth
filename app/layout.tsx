import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '📸 Photobooth Kekinian',
  description: 'Aplikasi photobooth modern dengan fitur grid, background, dan bingkai kekinian',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}