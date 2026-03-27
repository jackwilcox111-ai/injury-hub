import { useParams, Link, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { blogPosts, CATEGORY_COLORS } from '@/lib/blog-data';
import { format, parseISO } from 'date-fns';

export default function ResourceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) return <Navigate to="/resources" replace />;

  // Simple markdown-ish rendering for headings, bold, lists
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      if (trimmed.startsWith('## ')) return <h2 key={i} className="text-xl font-display font-bold text-foreground mt-8 mb-3">{trimmed.slice(3)}</h2>;
      if (trimmed.startsWith('### ')) return <h3 key={i} className="text-base font-display font-semibold text-foreground mt-6 mb-2">{trimmed.slice(4)}</h3>;
      if (trimmed.startsWith('- **')) {
        const match = trimmed.match(/^- \*\*(.+?)\*\*(.*)$/);
        if (match) return <li key={i} className="text-sm text-muted-foreground leading-relaxed ml-4 mb-1"><strong className="text-foreground">{match[1]}</strong>{match[2]}</li>;
      }
      if (trimmed.startsWith('- ')) return <li key={i} className="text-sm text-muted-foreground leading-relaxed ml-4 mb-1">{trimmed.slice(2)}</li>;
      if (/^\d+\.\s/.test(trimmed)) {
        const text = trimmed.replace(/^\d+\.\s/, '');
        return <li key={i} className="text-sm text-muted-foreground leading-relaxed ml-4 mb-1 list-decimal">{renderInline(text)}</li>;
      }
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{renderInline(trimmed)}</p>;
    });
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Related articles (same category, excluding current)
  const related = blogPosts.filter(p => p.category === post.category && p.slug !== post.slug).slice(0, 2);

  return (
    <PublicLayout>
      <Helmet>
        <title>{post.title} | Got Hurt Injury Network</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={`${window.location.origin}/resources/${post.slug}`} />
      </Helmet>

      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        {/* Back link */}
        <Link to="/resources" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Resources
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[post.category]}`}>
            {post.category === 'general' ? 'Industry Insights' : `For ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}`}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {post.readTime}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {format(parseISO(post.publishedAt), 'MMMM d, yyyy')}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-foreground leading-tight mb-4">
          {post.title}
        </h1>

        <p className="text-sm text-muted-foreground mb-2">By {post.author}</p>

        <div className="w-full h-px bg-border my-8" />

        {/* Content */}
        <div className="prose-custom">
          {renderContent(post.content)}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 rounded-xl bg-primary/[0.04] border border-primary/10 text-center">
          <p className="font-display font-bold text-foreground mb-2">Need Help?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Call the Got Hurt Injury Network at <a href="tel:800-729-1570" className="text-primary font-medium">800-729-1570</a> or get started online.
          </p>
          <Button asChild size="sm">
            <Link to="/get-started">Get Started</Link>
          </Button>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display font-bold text-foreground mb-4">Related Articles</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {related.map(r => (
                <Link
                  key={r.slug}
                  to={`/resources/${r.slug}`}
                  className="border border-border rounded-xl p-4 bg-card hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <h3 className="font-display font-semibold text-sm text-foreground mb-1.5 leading-snug">{r.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PublicLayout>
  );
}
