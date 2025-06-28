import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://lumen-adtech.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/advertiser/',
        '/partner/',
        '/unauthorized',
        '/auth/'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
} 