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
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gold/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold/5 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-theme bg-theme-main/60 backdrop-blur-3xl px-8 py-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="font-serif text-3xl tracking-tighter text-theme-base font-light cursor-pointer flex items-center gap-4 group" onClick={() => setSelectedPainting(null)}>
              <div className="w-12 h-12 rounded-full border border-gold/40 flex items-center justify-center text-xl italic text-gold group-hover:bg-gold/10 transition-all shadow-[0_0_20px_rgba(var(--gold-accent),0.1)]">M</div>
              <span className="hidden lg:block">Millennium <span className="italic text-theme-mute group-hover:text-gold transition-colors">Archive</span></span>
            </h1>
          </div>
          
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setSortBy(prev => prev === 'default' ? 'artist' : 'default')}
              className={`flex items-center gap-3 px-6 h-12 rounded-full border glass transition-all duration-300 ${
                sortBy === 'artist' 
                  ? 'border-gold bg-gold/10 text-gold' 
                  : 'border-theme text-theme-mute hover:border-gold/40'
              }`}
              title="Sort by Artist Name"
            >
              <ArrowDownAz className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-widest font-bold hidden sm:block">
                {sortBy === 'artist' ? 'By Artist' : 'Default Sort'}
              </span>
            </button>

            <button 
              onClick={() => setIsNightMode(!isNightMode)}
              className="w-12 h-12 rounded-full border border-theme glass flex items-center justify-center text-theme-base hover:border-gold/40 transition-all group"
              title={isNightMode ? 'Switch to Ethereal Mode' : 'Switch to Nocturnal Mode'}
            >
              {isNightMode ? <Sun className="h-5 w-5 group-hover:text-gold" /> : <Moon className="h-5 w-5 group-hover:text-gold" />}
            </button>

            <div className="relative group hidden md:block">
              <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-mute transition-colors group-focus-within:text-gold" />
              <input 
                type="text" 
                placeholder="Search the Archive..." 
                className="rounded-full border border-theme bg-theme-side/50 py-3.5 pl-14 pr-8 text-[13px] font-medium tracking-wide transition-all focus:border-gold/40 focus:outline-none focus:ring-4 focus:ring-gold/5 w-64 lg:w-96 placeholder:text-theme-mute/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="w-12 h-12 rounded-full glass border border-theme flex items-center justify-center text-theme-base hover:border-gold/40 transition-all">
              <Menu className="h-5 w-5" />
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
              <div className="mb-20">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.6em] text-gold/60 mb-6 flex items-center gap-4">
                    <span className="h-[1px] w-8 bg-gold/30" />
                    Millennium Archive
                  </p>
                  <h2 className="text-6xl md:text-9xl font-serif font-light tracking-tighter max-w-5xl leading-[0.9] mb-12 select-none text-theme-base">
                    The <span className="italic text-gold">Grammar</span> of Light.
                  </h2>
                  <div className="flex flex-wrap items-center gap-16 text-theme-mute text-[12px] uppercase tracking-[0.3em] font-medium border-t border-theme pt-12">
                    <div className="flex flex-col gap-3">
                      <span className="text-theme-mute/40">Collection Size</span>
                      <span className="text-theme-base font-bold">{paintings.length} Works</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-theme-mute/40">Database Source</span>
                      <span className="text-theme-base font-bold">Cleveland Museum of Art</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-theme-mute/40">Analysis Engine</span>
                      <span className="text-theme-base font-bold">Optic-AI v4.2</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Enhanced Categories */}
              <div className="mb-14 sticky top-24 z-40 py-6 bg-theme-main/80 backdrop-blur-2xl -mx-4 px-4 overflow-x-auto no-scrollbar border-y border-theme">
                <div className="flex items-center gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.25em] transition-all border whitespace-nowrap ${
                        activeCategory === cat 
                        ? 'bg-gold text-white border-gold shadow-[0_10px_30px_rgba(var(--gold-accent),0.3)]' 
                        : 'bg-transparent text-theme-mute border-theme hover:border-theme hover:text-theme-base hover:bg-theme-side/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refined Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-12 gap-y-20">
                {filteredPaintings.map((painting, index) => (
                  <motion.div 
                    key={painting.id}
                    layoutId={painting.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index % 20) * 0.02, duration: 0.5 }}
                    onClick={() => handleSelectPainting(painting)}
                    className="group relative cursor-pointer"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-theme-side transition-all duration-700 ring-1 ring-white/5 group-hover:ring-gold/20 group-hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
                      <SafeImage 
                        src={painting.imageUrl} 
                        alt={painting.title}
                        className="h-full w-full object-cover transition-all duration-[2s] group-hover:scale-110 opacity-70 group-hover:opacity-100 grayscale-[0.3] group-hover:grayscale-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    </div>
                    
                    <div className="mt-10 px-4">
                      <div className="flex items-center gap-4 mb-4">
                         <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-gold font-bold border border-gold/30 px-3 py-1 rounded">
                          {painting.year}
                         </span>
                         <span className="h-[1px] w-6 bg-theme-mute/20" />
                         <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-theme-mute font-medium truncate max-w-[120px]">
                          {painting.category}
                         </span>
                      </div>
                      <h3 className="font-serif text-3xl font-light leading-tight mb-3 group-hover:text-gold transition-colors duration-500 text-theme-base line-clamp-2">
                        {painting.title}
                      </h3>
                      <p className="text-[11px] text-theme-mute uppercase tracking-[0.4em] font-extrabold truncate">
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
            >
              <div className="flex items-center justify-between mb-16 gap-8">
                <button 
                  onClick={() => setSelectedPainting(null)}
                  className="group flex items-center gap-6 text-[12px] text-theme-mute hover:text-theme-base transition-all uppercase tracking-[0.6em] font-bold"
                >
                  <div className="h-14 w-14 flex items-center justify-center rounded-full border border-theme bg-theme-side/50 group-hover:bg-gold/10 group-hover:border-gold/30 transition-all shadow-lg">
                    <ChevronLeft className="h-5 w-5" />
                  </div>
                  Back to Collection
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-start">
                {/* Image Section */}
                <div className="lg:col-span-7 xl:col-span-8 lg:sticky lg:top-36">
                  <motion.div 
                    layoutId={selectedPainting.id}
                    className="relative group perspective-1000"
                  >
                    <div className="relative overflow-hidden rounded-[3rem] bg-theme-side p-3 ring-1 ring-white/5 shadow-2xl transition-all duration-1000">
                      <SafeImage 
                        src={selectedPainting.imageUrl} 
                        alt={selectedPainting.title}
                        className="w-full h-auto max-h-[85vh] object-contain rounded-[2.5rem] mx-auto shadow-[0_50px_100px_-30px_rgba(0,0,0,0.9)]"
                      />
                    </div>
                    {/* Perspective shadow */}
                    <div className="absolute -bottom-10 inset-x-20 h-20 bg-gold/10 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  </motion.div>
                </div>

                {/* Info Section */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-16">
                  <header className="space-y-10">
                    <div className="space-y-4">
                      <h2 className="font-serif text-7xl md:text-9xl font-light tracking-tighter leading-[0.85] text-theme-base">
                        {selectedPainting.title}
                      </h2>
                      <div className="flex items-center gap-4 text-2xl font-serif italic text-theme-mute">
                        <span>{selectedPainting.artist}</span>
                        <span className="h-1 w-1 rounded-full bg-theme-mute/40" />
                        <span>{selectedPainting.year}</span>
                        <span className="h-1 w-1 rounded-full bg-theme-mute/40" />
                        <span>{selectedPainting.category}</span>
                      </div>
                    </div>
                    
                    <div className="p-10 rounded-[3rem] bg-theme-side/50 border border-theme relative overflow-hidden group shadow-2xl">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gold/30 group-hover:bg-gold transition-colors" />
                      <p className="text-xl leading-[1.8] text-theme-mute font-light">
                        {selectedPainting.description}
                      </p>
                    </div>
                  </header>

                  <div className="h-[1px] w-full bg-gradient-to-r from-theme-mute/10 via-transparent to-transparent" />

                  {analyzing ? (
                    <div className="py-24 flex flex-col items-center justify-center bg-theme-side/30 rounded-[3rem] border border-theme animate-pulse">
                      <Loader2 className="h-10 w-10 animate-spin text-gold mb-6 opacity-30" />
                      <p className="text-[11px] font-mono uppercase tracking-[0.6em] text-theme-mute/40">Analyzing Optic Fingerprint...</p>
                    </div>
                  ) : selectedPainting.analysis && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-16"
                    >
                      <div className="relative p-10 rounded-[2.5rem] bg-gold/[0.03] border border-gold/[0.1] overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                          <History className="h-16 w-16 text-gold" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 text-gold uppercase tracking-[0.4em] text-[10px] font-bold mb-6">
                            <span className="h-[1px] w-4 bg-gold/40" />
                            Contextual Anchor
                          </div>
                          <p className="text-lg leading-relaxed text-gold/80 italic font-serif">
                            "{selectedPainting.analysis.historicalContext}"
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-16">
                        <div className="flex flex-wrap gap-3">
                          {selectedPainting.analysis.tags.map((tag) => (
                            <span key={tag} className="px-5 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] uppercase tracking-widest font-black">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <TechnicalSegment 
                          icon={<Film className="h-4 w-4" />}
                          title="Cinematography"
                          content={selectedPainting.analysis.cinematography}
                        />
                        
                        <TechnicalSegment 
                          icon={<Camera className="h-4 w-4" />}
                          title="Photography"
                          content={selectedPainting.analysis.photography}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-40 border-t border-theme bg-theme-side/40 text-center">
        <div className="max-w-2xl mx-auto px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.8em] text-theme-mute/20 mb-8">A Digital Archive of Human Vision</p>
          <div className="flex flex-wrap justify-center gap-12 text-[10px] uppercase tracking-[0.4em] text-theme-mute/40 font-black">
            <span className="hover:text-gold transition-colors cursor-help">Format: AR 4:3</span>
            <span className="hover:text-gold transition-colors cursor-help">Sensory Deconstruct v4.2</span>
            <span className="hover:text-gold transition-colors cursor-help">Copyright MMXXIV</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


function TechnicalSegment({ icon, title, content }: { icon: any, title: string, content: string }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 text-theme-mute/30 uppercase tracking-[0.45em] text-[11px] font-black">
        <div className="text-gold/60">{icon}</div>
        <span>{title}</span>
      </div>
      <div className="p-10 rounded-[3rem] bg-theme-side/50 border border-theme group hover:border-gold/30 transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
        <p className="text-xl leading-relaxed text-theme-mute font-light">
          {content}
        </p>
      </div>
    </div>
  );
}

