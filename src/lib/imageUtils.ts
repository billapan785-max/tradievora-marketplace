/**
 * Utility to optimize image URLs using a proxy service (images.weserv.nl)
 * This helps reduce the size of images already uploaded to the database
 * without needing to re-upload them.
 */
export const getOptimizedImageUrl = (url: string | undefined, width: number = 600): string => {
  if (!url) return '';
  
  // If it's a base64 string or already optimized, return as is
  if (url.startsWith('data:') || url.includes('images.weserv.nl')) {
    return url;
  }

  // Clean the URL (remove protocol for weserv if needed, but it handles full URLs too)
  const encodedUrl = encodeURIComponent(url);
  
  // weserv.nl parameters:
  // w: width
  // output: webp (better compression)
  // q: quality (80 is a good balance)
  // il: interlaced (for progressive loading)
  return `https://images.weserv.nl/?url=${encodedUrl}&w=${width}&output=webp&q=80&il`;
};
