export function getApiBaseUrl(): string {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  if (viteApiUrl) {
    return viteApiUrl;
  }
  
  // Frontend and backend are on same domain (either localhost or Render)
  // Use relative URLs - no need for baseUrl
  return '';
}

export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  if (baseUrl === '') {
    return endpoint;
  }
  return `${baseUrl}${endpoint}`;
}
