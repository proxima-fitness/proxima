export const metadata = {
  title: 'Login or Signup',
  description: 'Login or Signup to your Proxima Account',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <>{children}</>
  )
}
