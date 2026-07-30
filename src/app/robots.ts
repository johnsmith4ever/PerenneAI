import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://perenne-ai.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
