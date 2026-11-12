import type { Metadata } from "next";
import { Lora, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import BagDrawer from "@/components/BagDrawer";
import { fetchShippingConfig } from "@/lib/data";
import { DEFAULT_SHIPPING_CONFIG } from "@/lib/pricing";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pingodeluz.com"),
  title: "Pingo de Luz · e-commerce infantil",
  description: "Roupas feitas com carinho para os pequenos pingos que iluminam a casa.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A mini-sacola mostra a barra de frete grátis em qualquer página. Se o
  // banco estiver fora, o layout não pode cair junto — a página em si já
  // trata o erro; aqui usamos o padrão e seguimos.
  const shipping = await fetchShippingConfig().catch(() => DEFAULT_SHIPPING_CONFIG);

  return (
    <html lang="pt-BR" className={`${lora.variable} ${nunitoSans.variable}`}>
      <body>
        <CartProvider>
          <UserProvider>
            {children}
            <BagDrawer shipping={shipping} />
          </UserProvider>
        </CartProvider>
      </body>
    </html>
  );
}
