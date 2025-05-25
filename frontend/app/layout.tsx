import '../styles/globals.css'

export const metadata = {
  title: 'AI Chat Assistant',
  description: 'Upload files and chat with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
