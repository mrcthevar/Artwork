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
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isNightMode, setIsNightMode] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'default' | 'artist'>('default');
  
  // Dynamic Collection
  const [paintings, setPaintings] = useState<Painting[]>(FAMOUS_PAINTINGS);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore) return;
    setIsFetching(true);
    try {
      const newWorks = await fetchArtworks(page, 50);
      if (newWorks.length === 0) {
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
    // Load initial batch if needed
    if (paintings.length < 50) {
      loadMore();
    }
  }, [loadMore, paintings.length]);

  useEffect(() => {
    if (!isNightMode) {
      document.documentElement.classList.add('theme-day');
    } else {
      document.documentElement.classList.remove('theme-day');
    }
  }, [isNightMode]);

  const categories = useMemo(() => {
    const cats = new Set(paintings.map(p => p.category));
    return ['All', ...Array.from(cats)].slice(0, 15); // Limit UI categories
  }, [paintings]);

  const filteredPaintings = useMemo(() => {
    const filtered = paintings.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.artist.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'artist') {
      return [...filtered].sort((a, b) => a.artist.localeCompare(b.artist));
    }
    
    return filtered;
  }, [searchTerm, activeCategory, paintings, sortBy]);

  const handleSelectPainting = async (painting: Painting) => {
    setSelectedPainting(painting);
    if (!painting.analysis) {
      setAnalyzing(true);
      try {
        const analysis = await analyzePainting(painting.title, painting.artist);
        painting.analysis = analysis;
        setSelectedPainting({ ...painting });
      } catch (error) {
        console.error("Analysis failed:", error);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-theme-main font-sans text-theme-base selection:bg-gold selection:text-black antialiased transition-colors duration-700">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-gold/5 blur-[100px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-8 z-50 w-full px-8 pointer-events-none">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between pointer-events-auto">
          <h1 
            className="font-serif text-2xl tracking-tighter text-theme-base font-light cursor-pointer flex items-center gap-4 glass px-6 py-3 rounded-full" 
            onClick={() => setSelectedPainting(null)}
          >
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-sm italic text-gold font-bold">A</div>
            <span className="hidden sm:block">Artwork</span>
          </h1>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center glass rounded-full px-2 overflow-hidden">
              <Search className="h-4 w-4 ml-4 text-theme-mute" />
              <input 
                type="text" 
                placeholder="Search repository..." 
                className="bg-transparent py-3 px-4 text-xs font-medium tracking-wide focus:outline-none w-48 lg:w-64 placeholder:text-theme-mute/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button 
              onClick={() => setIsNightMode(!isNightMode)}
              className="w-12 h-12 rounded-full glass flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            >
              {isNightMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button className="w-12 h-12 rounded-full glass flex items-center justify-center lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-36 pb-24 px-8 max-w-[1600px] mx-auto overflow-visible">
        <AnimatePresence mode="wait">
          {!selectedPainting ? (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Hero Header */}
              <div className="mb-24 text-center">
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.8em] text-gold/60 mb-8 select-none">
                    Digital Visual Repository
                  </p>
                  <h2 className="text-7xl md:text-[10rem] font-serif font-light tracking-tighter leading-[0.85] mb-12 select-none text-theme-base text-balance mx-auto max-w-6xl">
                    The <span className="italic text-gold">Grammar</span> of Light.
                  </h2>
                  
                  <div className="flex flex-wrap items-center justify-center gap-10 text-theme-mute text-[10px] uppercase tracking-[0.4em] font-medium opacity-40">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                      <span>{paintings.length} Curated Works</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                      <span>Artwork Repository Access</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Enhanced Categories */}
              <div className="mb-20 glass rounded-[2rem] p-3 max-w-fit mx-auto sticky top-28 z-40">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                        activeCategory === cat 
                        ? 'bg-theme-base text-theme-main shadow-lg scale-100' 
                        : 'text-theme-mute hover:text-theme-base hover:bg-white/5 scale-95 opacity-70'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refined Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-10 gap-y-16">
                {filteredPaintings.map((painting, index) => (
                  <motion.div 
                    key={painting.id}
                    layoutId={`painting-${painting.id}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: (index % 12) * 0.05, 
                      duration: 0.8,
                      ease: [0.23, 1, 0.32, 1]
                    }}
                    onClick={() => handleSelectPainting(painting)}
                    className="group relative cursor-pointer hover-lift"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-3xl glass shadow-xl">
                      <SafeImage 
                        src={painting.imageUrl} 
                        alt={painting.title}
                        className="h-full w-full object-cover transition-all duration-[2.5s] group-hover:scale-105 opacity-80 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                      
                      <div className="absolute bottom-6 left-6 right-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="h-8 w-8 rounded-full glass flex items-center justify-center mb-3">
                          <Plus className="h-4 w-4 text-gold" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gold mb-1">Explore Visuals</p>
                      </div>
                    </div>
                    
                    <div className="mt-8 px-2">
                      <h3 className="font-serif text-2xl font-light leading-tight mb-2 text-theme-base line-clamp-1 group-hover:text-gold transition-colors duration-500">
                        {painting.title}
                      </h3>
                      <p className="text-[10px] text-theme-mute uppercase tracking-[0.3em] font-bold truncate opacity-60">
                        {painting.artist}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Load More Trigger */}
              {hasMore && (
                <div className="mt-32 flex justify-center">
                  <button 
                    onClick={loadMore}
                    disabled={isFetching}
                    className="group flex flex-col items-center gap-6"
                  >
                    <div className="w-20 h-20 rounded-full border border-theme glass flex items-center justify-center transition-all group-hover:border-gold group-hover:scale-110">
                      {isFetching ? (
                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                      ) : (
                        <Plus className="h-8 w-8 text-gold" />
                      )}
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.6em] text-theme-mute group-hover:text-gold transition-colors">
                      {isFetching ? 'Expanding Repository' : 'Expand Collection'}
                    </span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-[1400px] mx-auto"
            >
              <div className="flex items-center justify-between mb-16">
                <button 
                  onClick={() => setSelectedPainting(null)}
                  className="group flex items-center gap-4 text-[10px] text-theme-mute hover:text-theme-base transition-all uppercase tracking-[0.4em] font-bold glass px-6 py-3 rounded-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Close Archive
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                {/* Image Section */}
                <div className="lg:col-span-7 xl:col-span-8 lg:sticky lg:top-36">
                  <motion.div 
                    layoutId={`painting-${selectedPainting.id}`}
                    className="relative group transition-all duration-1000"
                  >
                    <div className="relative overflow-hidden rounded-[2.5rem] glass p-2 shadow-2xl transition-all duration-1000">
                      <SafeImage 
                        src={selectedPainting.imageUrl} 
                        alt={selectedPainting.title}
                        className="w-full h-auto max-h-[80vh] object-contain rounded-[2rem] mx-auto shadow-2xl"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Info Section */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-12">
                  <header className="space-y-8">
                    <div className="space-y-4">
                      <h2 className="font-serif text-6xl md:text-8xl font-light tracking-tighter leading-[0.9] text-theme-base text-balance">
                        {selectedPainting.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-xl font-serif italic text-theme-mute opacity-60">
                        <span>{selectedPainting.artist}</span>
                        <span className="w-1 h-1 rounded-full bg-gold/30" />
                        <span>{selectedPainting.year}</span>
                      </div>
                    </div>
                    
                    <div className="p-8 rounded-[2rem] glass border-gold/10 group shadow-xl">
                      <p className="text-lg leading-[1.7] text-theme-mute font-light text-balance opacity-80">
                        {selectedPainting.description}
                      </p>
                    </div>
                  </header>

                  {analyzing ? (
                    <div className="py-20 flex flex-col items-center justify-center glass rounded-[2.5rem] animate-pulse">
                      <Loader2 className="h-8 w-8 animate-spin text-gold mb-6 opacity-30" />
                      <p className="text-[10px] font-mono uppercase tracking-[0.6em] text-theme-mute/40">Analyzing Visual DNA...</p>
                    </div>
                  ) : selectedPainting.analysis && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-12"
                    >
                      <div className="flex flex-wrap gap-2">
                        {selectedPainting.analysis.tags.map((tag) => (
                          <span key={tag} className="px-5 py-2 rounded-full glass border-gold/10 text-gold text-[9px] uppercase tracking-widest font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-12">
                        <TechnicalSegment 
                          icon={<Film className="h-4 w-4" />}
                          title="Optical Geometry"
                          content={selectedPainting.analysis.cinematography}
                        />
                        
                        <TechnicalSegment 
                          icon={<Camera className="h-4 w-4" />}
                          title="Photographic Science"
                          content={selectedPainting.analysis.photography}
                        />

                        <div className="relative p-8 rounded-[2rem] bg-gold/[0.02] border border-gold/[0.05]">
                          <div className="flex items-center gap-3 text-gold/40 uppercase tracking-[0.4em] text-[9px] font-bold mb-4">
                            <History className="h-3 w-3" />
                            Provenance context
                          </div>
                          <p className="text-base leading-relaxed text-theme-mute italic font-serif">
                             {selectedPainting.analysis.historicalContext}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
    </div>
  );
}


function TechnicalSegment({ icon, title, content }: { icon: any, title: string, content: string }) {
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

