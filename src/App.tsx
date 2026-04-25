import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FAMOUS_PAINTINGS } from './constants';
import { Painting } from './types';
import { analyzePainting } from './services/geminiService';
import { fetchArtworks } from './services/artService';
import { Search, Camera, Film, History, ChevronLeft, Loader2, PlayCircle, Sun, Moon, Menu, Plus, ArrowDownAz } from 'lucide-react';

function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-theme-side animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-gold/20" />
        </div>
      )}
      {!error ? (
        <img
          src={src}
          alt={alt}
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-1000`}
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-theme-side to-black p-8 text-center ${className}`}>
          <div className="w-20 h-[1px] bg-gold/20 mb-6" />
          <p className="font-serif italic text-gold/40 text-sm mb-2 px-4 line-clamp-2">{alt}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/5">Visual Data Lost in Archive</p>
          <div className="w-12 h-12 mt-8 rounded-full border border-gold/5 flex items-center justify-center">
            <Camera className="h-4 w-4 text-gold/10" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [paintings, setPaintings] = useState<Painting[]>(FAMOUS_PAINTINGS);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'ARTIST' | 'YEAR'>('DEFAULT');

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore) return;
    setIsFetching(true);
    try {
      const result = await fetchArtworks(page, 100);
      const newWorks = result.paintings;
      if (!result.hasMore) {
        setHasMore(false);
      } else {
        setPaintings(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const filteredNew = newWorks.filter(nw => !existingIds.has(nw.id));
          return [...prev, ...filteredNew];
        });
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error("Load more failed:", error);
    } finally {
      setIsFetching(false);
    }
  }, [page, isFetching, hasMore]);

  useEffect(() => {
    if (paintings.length < 100) {
      loadMore();
    }
  }, [loadMore, paintings.length]);

  const sortedPaintings = useMemo(() => {
    let filtered = [...paintings];
    if (selectedEra !== 'ALL') {
      filtered = filtered.filter(p => p.category.toUpperCase().includes(selectedEra));
    }
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.artist.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'ARTIST') {
      filtered.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (sortBy === 'YEAR') {
      filtered.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearA - yearB;
      });
    }
    return filtered;
  }, [paintings, selectedEra, selectedCategory, searchQuery, sortBy]);

  const handleAnalyze = useCallback(async (painting: Painting) => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzePainting(painting);
      setSelectedPainting({ ...painting, analysis } as Painting & { analysis: any });
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const toggleEtherealMode = () => setDarkMode(prev => !prev);

  const eras = ['ALL', 'RENAISSANCE', 'BAROQUE', 'POST-IMPRESSIONISM', 'ROMANTICISM', 'REALISM', 'MODERN', 'EXPRESSIONISM', 'IMPRESSIONISM'];
  const categories = ['ALL', 'PAINTING'];

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${darkMode ? 'bg-black text-gold' : 'bg-[#1a1610] text-[#c9a96e]'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-theme-border/50 backdrop-blur-xl">
        <div className="max-w-[90vw] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center bg-gradient-to-br from-gold/10 to-transparent">
              <span className="font-serif text-gold text-lg">M</span>
            </div>
            <div>
              <h1 className="font-serif text-xl tracking-tight text-gold select-none">Millennium <span className="font-light italic text-gold/60">Archive</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortBy(prev => prev === 'DEFAULT' ? 'ARTIST' : prev === 'ARTIST' ? 'YEAR' : 'DEFAULT')}
              className="glass px-4 py-2 rounded-full text-[10px] uppercase tracking-widest hover:bg-gold/10 transition-colors select-none"
            >
              {sortBy === 'DEFAULT' && <ArrowDownAz className="inline w-3 h-3 mr-1" />}DEFAULT SORT
            </button>
            <button
              onClick={toggleEtherealMode}
              className="glass p-2 rounded-full hover:bg-gold/10 transition-colors"
              aria-label="Switch to Ethereal Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-gold/60" /> : <Moon className="w-4 h-4 text-gold/60" />}
            </button>
            <div className="relative group">
              <input
                type="text"
                placeholder="Search the Archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass pl-9 pr-4 py-2 rounded-full text-[11px] w-64 focus:w-80 transition-all bg-transparent border border-theme-border/30 placeholder:text-theme-mute/40 focus:outline-none focus:border-gold/30 text-gold/70"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold/30" />
            </div>
            <button
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="glass p-2 rounded-full hover:bg-gold/10 transition-colors md:hidden"
            >
              <Menu className="w-4 h-4 text-gold/60" />
            </button>
          </div>
        </div>
      </header>

            {/* Main Content */}
      <main className="max-w-[90vw] mx-auto px-4 py-8">
        {/* Stats Banner */}
        <div className="glass rounded-[2rem] p-8 mb-8 border border-theme-border/30">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="font-serif text-2xl tracking-tight">MILLENNIUM ARCHIVE</h2>
            <div className="w-12 h-[1px] bg-gold/20" />
          </div>
          <h3 className="font-serif italic text-gold/40 text-lg mb-6">The Grammar of Light.</h3>
          <div className="flex flex-wrap gap-8 text-[10px] uppercase tracking-widest text-theme-mute/60">
            <div>
              <p className="text-gold/60 mb-1">Collection Size</p>
              <p className="font-mono text-lg text-gold/80">{paintings.length}</p>
              <p className="text-[9px]">WORKS</p>
            </div>
            <div>
              <p className="text-gold/60 mb-1">Database Source</p>
              <p className="font-mono text-gold/80">Cleveland Museum of Art</p>
            </div>
            <div>
              <p className="text-gold/60 mb-1">Analysis Engine</p>
              <p className="font-mono text-gold/80">Optic-AI v4.2</p>
            </div>
          </div>
        </div>

                {/* Era Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          {eras.map(era => (
            <button
              key={era}
              onClick={() => setSelectedEra(era)}
              className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                selectedEra === era
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'glass text-theme-mute/60 border border-theme-border/20 hover:border-gold/20'
              }`}
            >
              {era}
            </button>
          ))}
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                selectedCategory === cat
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'glass text-theme-mute/60 border border-theme-border/20 hover:border-gold/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

                {/* Gallery Grid */}
        <AnimatePresence>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {sortedPaintings.map((painting, idx) => (
              <motion.div
                key={painting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: Math.min(idx * 0.03, 0.5) }}
                className="group glass rounded-[1.5rem] overflow-hidden border border-theme-border/20 hover:border-gold/20 transition-all duration-500 cursor-pointer"
                onClick={() => setSelectedPainting(painting)}
              >
                <div className="aspect-[4/3] overflow-hidden bg-theme-side">
                  <SafeImage
                    src={painting.imageUrl}
                    alt={painting.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                </div>
                <div className="p-5 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-gold/40">{painting.year}</p>
                  <p className="text-[8px] uppercase tracking-widest text-theme-mute/40">{painting.category}</p>
                  <h4 className="font-serif text-sm text-gold/80 truncate">{painting.title}</h4>
                  <p className="text-[10px] text-theme-mute/60 truncate">{painting.artist}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

                {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-12">
            <button
              onClick={loadMore}
              disabled={isFetching}
              className="glass px-8 py-3 rounded-full text-[10px] uppercase tracking-widest hover:bg-gold/10 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
              {isFetching ? 'Expanding Repository' : 'Expand Collection'}
            </button>
          </div>
        )}

                {/* Detail Modal */}
        <AnimatePresence>
          {selectedPainting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={() => setSelectedPainting(null)}
            >
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative glass rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gold/20"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedPainting(null)}
                  className="absolute top-4 right-4 z-10 glass p-2 rounded-full hover:bg-gold/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gold/60" />
                </button>
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="bg-theme-side aspect-[4/3] md:aspect-auto md:h-full flex items-center justify-center">
                    <SafeImage
                      src={selectedPainting.imageUrl}
                      alt={selectedPainting.title}
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-gold/40">{selectedPainting.year}</p>
                      <p className="text-[9px] uppercase tracking-widest text-theme-mute/40">{selectedPainting.category}</p>
                      <h2 className="font-serif text-2xl text-gold/90">{selectedPainting.title}</h2>
                      <p className="font-serif italic text-gold/50 text-lg">{selectedPainting.artist}</p>
                    </div>
                    <div className="space-y-4">
                      <TechnicalSegment
                        icon={<Camera className="w-4 h-4" />}
                        title="Visual Analysis"
                        content={selectedPainting.analysis?.visualAnalysis || "Awaiting sensory deconstruction..."}
                      />
                      <TechnicalSegment
                        icon={<Film className="w-4 h-4" />}
                        title="Cinematic Context"
                        content={selectedPainting.analysis?.cinematicContext || "Awaiting cinematic mapping..."}
                      />
                      <TechnicalSegment
                        icon={<History className="w-4 h-4" />}
                        title="Provenance"
                        content={selectedPainting.description || "Provenance context"}
                      />
                    </div>
                    <button
                      onClick={() => handleAnalyze(selectedPainting)}
                      disabled={isAnalyzing}
                      className="glass px-6 py-3 rounded-full text-[10px] uppercase tracking-widest hover:bg-gold/10 transition-all disabled:opacity-50 w-full flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                      {isAnalyzing ? 'Deconstructing...' : 'Deconstruct Masterpiece'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

                {/* Footer */}
        <footer className="py-24 px-8 border-t border-theme-border/50 text-center glass mt-40">
          <div className="max-w-2xl mx-auto opacity-40">
            <p className="font-mono text-[9px] uppercase tracking-[0.8em] text-theme-mute mb-8 select-none">Artwork · Sensory Deconstruct v4.2</p>
            <div className="flex flex-wrap justify-center gap-8 text-[9px] uppercase tracking-[0.4em] text-theme-mute font-bold">
              <span className="hover:text-gold transition-colors cursor-help">Technical Repository</span>
              <span className="hover:text-gold transition-colors cursor-help">Open Access Protocol</span>
              <span className="hover:text-gold transition-colors cursor-help">MMXXIV</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function TechnicalSegment({ icon, title, content }: { icon: any; title: string; content: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-theme-mute/30 uppercase tracking-[0.5em] text-[10px] font-bold">
        <div className="text-gold/50">{icon}</div>
        <span>{title}</span>
      </div>
      <div className="group p-8 rounded-[2rem] glass hover:border-gold/30 transition-all shadow-xl">
        <p className="text-lg leading-[1.8] text-theme-mute font-light text-balance">
          {content}
        </p>
      </div>
    </div>
  );
}
