import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== 'production';
const allowLocalPreviewCsp = process.env.EZCOMO_PREVIEW_LOCAL_CSP === '1';

function readFirebaseAuthOrigin(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;

  const host = raw
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    ?.trim();

  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return null;
  return `https://${host}`;
}

const firebaseAuthOrigin = readFirebaseAuthOrigin(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);

// Firebase phone auth uses RecaptchaVerifier/signInWithPhoneNumber in the web
// client. Keep this allowlist narrow: official reCAPTCHA origins plus the two
// Firebase Auth API services and the configured Firebase auth-domain iframe.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  'https://www.googletagmanager.com',
  'https://connect.facebook.net',
  'https://www.google.com/recaptcha/',
  'https://www.gstatic.com/recaptcha/',
].join(' ');
const connectSrc = [
  "'self'",
  'https://*.supabase.co',
  'wss://*.supabase.co',
  'https://api.cloudinary.com',
  'https://api.resend.com',
  'https://www.google-analytics.com',
  'https://analytics.google.com',
  'https://stats.g.doubleclick.com',
  'https://www.google.com/recaptcha/',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  ...(firebaseAuthOrigin ? [firebaseAuthOrigin] : []),
  ...(isDevelopment
    ? [
        'http://127.0.0.1:*',
        'http://localhost:*',
        'ws://127.0.0.1:*',
        'ws://localhost:*',
      ]
    : allowLocalPreviewCsp
      ? [
          'http://127.0.0.1:54321',
          'ws://127.0.0.1:54321',
        ]
      : []),
].join(' ');
const frameSrc = [
  "'self'",
  'https://www.google.com/recaptcha/',
  'https://recaptcha.google.com/recaptcha/',
  ...(firebaseAuthOrigin ? [firebaseAuthOrigin] : []),
].join(' ');
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src ${scriptSrc}`,
  `connect-src ${connectSrc}`,
  `frame-src ${frameSrc}`,
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co https://www.facebook.com https://images.unsplash.com https://loremflickr.com https://placehold.co https://api.dicebear.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
].join('; ');

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackMemoryOptimizations: true,
  },
  images: {
    maximumRedirects: 5,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      'react-router-dom': './src/lib/react-router-dom-shim.tsx',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'react-router-dom': path.resolve(__dirname, 'src/lib/react-router-dom-shim.tsx'),
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
