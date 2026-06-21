export function getApiBaseUrl(): string {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  if (viteApiUrl) {
    return viteApiUrl.replace(/\/$/, "");
  }
  
  // Frontend and backend are on same domain (either localhost or Render)
  // Use relative URLs - no need for baseUrl
  return '';
}

export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (baseUrl === '') {
    return normalizedEndpoint;
  }

  return `${baseUrl}${normalizedEndpoint}`;
}
