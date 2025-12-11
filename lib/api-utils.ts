/**
 * Safely parse JSON from a fetch response
 * Handles empty responses and invalid JSON gracefully
 */
export async function safeJsonParse<T = unknown>(
  response: Response,
  context: string = 'API'
): Promise<T | null> {
  // Check if response has content
  const text = await response.text();

  if (!text || text.trim().length === 0) {
    console.error(`${context}: Empty response (status ${response.status})`);
    return null;
  }

  // Try to parse JSON
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error(
      `${context}: Invalid JSON (status ${response.status}):`,
      text.substring(0, 200)
    );
    return null;
  }
}

/**
 * Make a request to n8n with proper error handling
 */
export async function fetchFromN8n(
  endpoint: string,
  jwt: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${process.env.N8N_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      cookie: `auth=${jwt};`,
    },
  });
}
