import './style.css'

export const metadata = {
  title: 'Aurea Air · Daily air brief',
  description:
    'Compare regional air forecasts and plan practical changes for a household or community.',
}

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
