import "./globals.css";
import "./dark.css";
import "./features.css";
import "./styles/design-tokens.css";
import "./styles/animations.css";
import "./styles/homepage.css";
export const metadata = {
  title: "Deen e Safar — A Beautiful Journey",
  description: "A peaceful space to explore, learn, and grow in faith.",
  icons: { icon: "/app-icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

