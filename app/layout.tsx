import type { Metadata } from 'next';
import { wingShackTheme } from '@/theme/wingShackTheme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wing Shack Arcade',
  description: 'Wing Shack arcade games and interactive experiences',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Custom Zing Rust Fonts */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Zing Rust';
              src: url('/Zing Rust Demo Base/Zing Rust Demo Base.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
              font-family: 'Zing Rust Sans';
              src: url('/Zing Rust Demo Base/Zing Rust Demo Base.ttf') format('truetype');
              font-weight: 300;
              font-style: normal;
              font-display: swap;
            }
            
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `
        }} />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: wingShackTheme.colors.background,
          color: wingShackTheme.colors.text,
          fontFamily: wingShackTheme.typography.fontFamily.body,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textTransform: 'uppercase',
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 248, 240, 0.9) 50%, rgba(255, 248, 240, 1) 100%),
            radial-gradient(circle at 20% 30%, rgba(200, 88, 32, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(159, 8, 8, 0.03) 0%, transparent 50%)
          `,
          backgroundAttachment: 'fixed',
        }}
      >
        {children}
      </body>
    </html>
  );
}

