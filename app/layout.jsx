import './globals.css';
import Providers from './providers';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'ECWC Plant & Equipment',
  description: 'ECWC Plant & Equipment Management System',
  icons: {
    icon: '/pelogo.png',
    shortcut: '/pelogo.png',
    apple: '/pelogo.png',
  },
  openGraph: {
    title: 'ECWC Plant & Equipment',
    description: 'ECWC Plant & Equipment Management System',
    images: [{ url: '/pelogo.png', width: 512, height: 512, alt: 'ECWC Logo' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
