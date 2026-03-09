import './globals.css';

export const metadata = {
  title: 'Lifewood Expense AI',
  description: 'Manage scanned Google Drive expense workspaces with Lifewood branding',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
