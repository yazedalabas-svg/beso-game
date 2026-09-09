import type { Metadata } from 'next';
import './globals.css';
import './game.css';

export const metadata: Metadata = {
  title: 'لا تطلع يا بيسو — لعبة رعب وكوميديا',
  description: 'خويك يعرف طريق الخروج. المشكلة... إنه ما يبيك تطلع. لعبة رعب وكوميديا بمنظور الشخص الأول وأربع نهايات.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
      </body>
    </html>
  );
}
