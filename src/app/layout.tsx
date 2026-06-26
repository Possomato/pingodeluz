import type { Metadata } from "next";
import { Lora, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import { AdminProvider } from "@/context/AdminContext";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pingo de Luz · e-commerce infantil",
  description: "Roupas feitas com carinho para os pequenos pingos que iluminam a casa.",
  icons: { icon: '/icone-logo.png', apple: '/icone-logo.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${lora.variable} ${nunitoSans.variable}`}>
      <body>
        <CartProvider>
          <UserProvider>
            <AdminProvider>
              {children}
            </AdminProvider>
          </UserProvider>
        </CartProvider>
      </body>
    </html>
  );
}
