import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ServiceWorkerRegister from './sw-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'Controle Parental — em construção',
};

const CSP =
  "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
