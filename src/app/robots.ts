import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/terms'],
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard',
        '/assistant',
        '/flashcards',
        '/quiz',
        '/essay',
        '/history',
        '/weak-areas',
        '/math-solver',
        '/mindmaps',
        '/calendar',
        '/daily-poll',
        '/debate',
        '/explore',
        '/welcome',
        '/fun',
        '/community',
        '/subscriptions',
        '/Voicesprint',
        '/voicesprint',
        '/sign-in',
        '/sign-up',
      ],
    },
    sitemap: 'https://perenne-ai.co.uk/sitemap.xml',
  };
}
