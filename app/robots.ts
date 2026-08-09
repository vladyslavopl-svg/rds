import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/profile', '/wallet', '/chats', '/api/'],
    },
    sitemap: 'https://razdwaszybko.pl/sitemap.xml',
  };
}