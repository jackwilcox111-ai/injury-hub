import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Helmet } from 'react-helmet-async';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import { blogPosts, BLOG_CATEGORIES, CATEGORY_COLORS } from '@/lib/blog-data';
import { format, parseISO } from 'date-fns';

export default function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(() => {
    let result = [...blogPosts];
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.category.includes(q)
      );
    }
    return result.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }, [search, activeCategory]);

  return (
    <PublicLayout>
      <Helmet>
        <title>Resources & Blog | Got Hurt Injury Network</title>
        <meta name="description" content="Expert guides and resources for personal injury patients, medical providers, and attorneys. Learn about lien-based treatment, case management, and more." />
        <link rel="canonical" href={`${window.location.origin}/resources`} />
      </Helmet>

      {/* Header */}
      <section className="bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-4">
            Resources & Guides
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Expert insights for every stakeholder in the personal injury process — from patients navigating their first claim to attorneys optimizing case value.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 text-sm bg-background"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {BLOG_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:bg-accent/80 hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-6">
          {filtered.length} article{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Article grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No articles found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filtered.map(post => (
              <Link
                key={post.slug}
                to={`/resources/${post.slug}`}
                className="group border border-border rounded-xl p-5 bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[post.category]}`}>
                    {post.category === 'general' ? 'Industry' : post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </div>
                </div>
                <h2 className="font-display font-bold text-sm text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(post.publishedAt), 'MMM d, yyyy')}
                  </span>
                  <span className="text-[11px] font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read More <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
