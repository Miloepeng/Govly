import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import AuthGuard from '../components/AuthGuard'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  )
} 