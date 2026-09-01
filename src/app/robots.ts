import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: [
        '/dashboard/',
        '/assistant/',
        '/flashcards/',
        '/quiz/',
        '/essay/',
        '/history/',
        '/admin/',
        '/mindmaps/',
        '/subscriptions/',
        '/explore/',
      ],
    },
    sitemap: 'https://perenne-ai.co.uk/sitemap.xml',
  };
}
