import type { Metadata } from 'next';
import './globals.css';
import Navbar from './componentes/Navbar';
import Footer from './componentes/Footer';
import WhatsAppButton from './componentes/WhatsAppButton';

export const metadata: Metadata = {
  title: 'FiltrAr - Catálogo Profesional e Industrial de Filtros',
  description: 'Catálogo técnico de filtros de aceite, aire, combustible y habitáculo. Búsqueda por vehículo, código FHL y equivalencias OEM en Argentina.',
  keywords: ['filtros', 'catalogo filtros', 'maxfil', 'pro filter', 'filtros aceite', 'filtros aire', 'equivalencias filtros', 'vehiculos'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth overflow-x-hidden max-w-full">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white overflow-x-hidden max-w-full">
        <Navbar />
        <div className="flex-grow w-full max-w-full overflow-x-hidden">{children}</div>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
