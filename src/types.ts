export interface PaintingAnalysis {
  cinematography: string;
  photography: string;
  historicalContext: string;
  tags: string[];
}

export interface Painting {
  id: string;
  title: string;
  artist: string;
  year: string;
  imageUrl: string;
  description: string;
  category: string;
  analysis?: PaintingAnalysis;
}
