import axios from 'axios';

/**
 * Fetches HTML content from a URL and extracts text
 */
export async function fetchAndExtractText(url: string): Promise<string> {
  try {
    console.log(`[HTMLParser] Fetching URL: ${url}`);
    
    // Fetch the HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 30000, // 30 seconds
      maxRedirects: 5,
    });

    const html = response.data;
    console.log(`[HTMLParser] Fetched ${html.length} characters of HTML`);

    // Simple text extraction - remove HTML tags and decode entities
    let text = html
      // Remove script and style tags and their content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`[HTMLParser] Extracted ${text.length} characters of text`);
    console.log(`[HTMLParser] First 500 chars: ${text.substring(0, 500)}`);

    if (text.length < 100) {
      throw new Error('Extracted text is too short. The page might not be accessible or might require JavaScript.');
    }

    return text;
  } catch (error: any) {
    if (error.response) {
      throw new Error(`Failed to fetch URL: HTTP ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error(`Failed to fetch URL: No response received. The URL might be invalid or unreachable.`);
    } else {
      throw new Error(`Failed to fetch URL: ${error.message}`);
    }
  }
}
