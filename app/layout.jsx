import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'ECWC Plant & Equipment',
  description: 'ECWC Plant & Equipment Management System',
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
