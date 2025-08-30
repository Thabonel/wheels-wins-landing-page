import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User, ArrowLeft } from 'lucide-react';

interface BlogPostProps {
  title: string;
  metaDescription: string;
  keywords: string;
  author?: string;
  publishDate?: string;
  readTime?: string;
  content: React.ReactNode;
  relatedPosts?: Array<{
    title: string;
    slug: string;
    excerpt: string;
  }>;
}

const BlogPostTemplate: React.FC<BlogPostProps> = ({
  title,
  metaDescription,
  keywords,
  author = 'Wheels & Wins Team',
  publishDate = new Date().toLocaleDateString(),
  readTime = '5 min read',
  content,
  relatedPosts = []
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": metaDescription,
    "author": {
      "@type": "Person",
      "name": author
    },
    "datePublished": publishDate,
    "publisher": {
      "@type": "Organization",
      "name": "Wheels & Wins",
      "logo": {
        "@type": "ImageObject",
        "url": "https://wheelsandwins.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": window.location.href
    }
  };

  return (
    <>
      <Helmet>
        <title>{title} | Wheels & Wins Blog</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={window.location.href} />
        
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="article:author" content={author} />
        <meta property="article:published_time" content={publishDate} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
            <li>/</li>
            <li><Link to="/blog" className="hover:text-blue-600">Blog</Link></li>
            <li>/</li>
            <li className="text-gray-900">{title}</li>
          </ol>
        </nav>

        {/* Back button */}
        <Link to="/blog" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              {author}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {publishDate}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {readTime}
            </div>
          </div>
        </header>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none">
          {content}
        </div>

        {/* CTA Section */}
        <div className="mt-12 p-8 bg-blue-50 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Your RV Adventure?</h2>
          <p className="text-gray-700 mb-6">
            Join 50,000+ RVers using Wheels & Wins to plan trips, track expenses, and connect with the community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Start Free Trial
            </Link>
            <Link
              to="/wheels"
              className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
            >
              Explore Features
            </Link>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="block p-6 bg-white border rounded-lg hover:shadow-lg transition"
                >
                  <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                  <p className="text-gray-600 text-sm">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Schema Breadcrumb */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://wheelsandwins.com/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://wheelsandwins.com/blog"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": title,
                "item": window.location.href
              }
            ]
          })}
        </script>
      </article>
    </>
  );
};

export default BlogPostTemplate;