import { Painting } from '../types';

const CMA_API_URL = 'https://openaccess-api.clevelandart.org/api/artworks';

export async function fetchArtworks(page: number = 1, limit: number = 50): Promise<Painting[]> {
  try {
    const skip = (page - 1) * limit;
    
    // CMA API: type=Painting, has_image=1
    const response = await fetch(
      `${CMA_API_URL}/?type=Painting&has_image=1&limit=${limit}&skip=${skip}`
    );

    if (!response.ok) {
      throw new Error(`CMA API Error: ${response.statusText}`);
    }

    const json = await response.json();
    const data = json.data || [];

    return data.map((item: any) => ({
      id: `cma-${item.id}`,
      title: item.title || 'Untitled',
      artist: item.creators?.[0]?.description || 'Unknown Artist',
      year: item.creation_date || 'Unknown Date',
      category: item.type || 'Painting',
      imageUrl: item.images?.web?.url || item.images?.print?.url || '',
      description: item.description || `${item.tombstone || 'Artwork from Cleveland Museum of Art.'}`
    })).filter((p: any) => p.imageUrl !== '');
  } catch (error) {
    console.error('Failed to fetch artworks from CMA:', error);
    return [];
  }
}
