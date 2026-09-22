import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CognitoProvider } from "./cognito-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AutoManager",
  description: "AutoManager — your fantasy football manager assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <CognitoProvider>{children}</CognitoProvider>
      </body>
    </html>
  );
}
