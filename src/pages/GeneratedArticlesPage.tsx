import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth'; // Assuming useAuth provides the user object
import { ExternalLink, CalendarDays, FileText, Edit3, X, Save } from 'lucide-react'; // Added Edit3, X, Save icons
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { ArticleEditor } from '../components/ArticleEditor';
import { ArticleContent } from '../lib/articleApi';

interface GeneratedArticle {
  id: string;
  title: string;
  product_name?: string; // Added product_name
  link: string;
  updated_at: string;
}

interface EditModalState {
  isOpen: boolean;
  articleId: string | null;
  articleTitle: string;
}

const GeneratedArticlesPage: React.FC = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState<GeneratedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    articleId: null,
    articleTitle: ''
  });

  useEffect(() => {
    const fetchArticles = async () => {
      if (!user) {
        // User is not yet available, keep loading state or set a specific auth-pending state
        // For now, we'll rely on the initial loading state set to true
        // and the effect re-running when user changes.
        // We won't set an error here immediately.
        return; 
      }

      // Proceed with fetching only if user is available
      setError(null); // Clear any previous errors like 'User not authenticated'
      try {
        setLoading(true);
        const { data, error: dbError } = await supabase
          .from('content_briefs')
          .select('id, possible_article_titles, product_name, link, updated_at') // Added product_name to select
          .eq('user_id', user.id)
          .not('link', 'is', null)
          .order('updated_at', { ascending: false });

        if (dbError) {
          throw dbError;
        }

        if (data) {
          const formattedArticles = data.map(article => {
            let parsedTitle = `Untitled Article ${article.id.substring(0, 4)}`;
            if (typeof article.possible_article_titles === 'string' && article.possible_article_titles.trim() !== '') {
              const titlesString = article.possible_article_titles;
              const match = titlesString.match(/^1\\.s*(.*?)(?:\\n2\\.|$)/s);
              if (match && match[1]) {
                parsedTitle = match[1].trim();
              } else {
                const firstLine = titlesString.split('\n')[0].trim();
                if (firstLine) parsedTitle = firstLine;
              }
            }
            return {
              id: article.id,
              title: parsedTitle,
              product_name: article.product_name || undefined,
              link: article.link,
              updated_at: new Date(article.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), // More readable date format
            };
          });
          setArticles(formattedArticles);
        }
      } catch (e: any) {
        console.error('Error fetching generated articles:', e);
        setError('Failed to fetch articles. ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [user]);

  const handleEditArticle = (articleId: string, title: string) => {
    setEditModal({
      isOpen: true,
      articleId,
      articleTitle: title
    });
  };

  const handleCloseEditor = () => {
    setEditModal({
      isOpen: false,
      articleId: null,
      articleTitle: ''
    });
  };

  const handleArticleSave = (data: ArticleContent) => {
    console.log('Article saved:', data);
    // Optionally refresh the articles list or show a success message
  };

  // If user is not available yet, show loading state within layout
  if (!user && loading) { // Modified condition to ensure loading is shown until user is available
    return (
      <UserDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Generated Articles</h1>
          <p className="text-gray-600">Loading user information...</p> {/* More specific loading message */}
        </div>
      </UserDashboardLayout>
    );
  }

  // If there's an actual fetch error (not auth related initially) within layout
  if (error) {
    return (
      <UserDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Generated Articles</h1>
          <p className="text-red-500">Error: {error}</p>
        </div>
      </UserDashboardLayout>
    );
  }

  // If loading is true (and user is available but data is fetching) within layout
  if (loading) {
    return (
      <UserDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Generated Articles</h1>
          <p className="text-gray-600">Loading articles...</p>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Generated Articles
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Access and edit your generated articles using our built-in editor or open them in Google Docs.
            </p>
          </div>
          {/* Optional: Add a total count here if desired later */}
        </header>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No generated articles found</h3>
            <p className="mt-1 text-sm text-gray-500">Once articles are generated, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <div
                key={article.id}
                className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out overflow-hidden border border-gray-200 flex flex-col h-full"
              >
                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    {article.product_name && (
                      <span className="inline-block bg-primary-100 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
                        {article.product_name}
                      </span>
                    )}
                    {/* Placeholder for a potential top-right icon or badge if needed */}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-2 min-h-[2.5em] leading-tight group-hover:text-primary-600 transition-colors duration-200">
                    {article.title}
                  </h2>
                  
                  <div className="flex items-center text-xs text-gray-500 mt-auto">
                    <CalendarDays size={14} className="mr-1.5 text-gray-400" />
                    <span>Last updated: {article.updated_at}</span>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="bg-gray-50 border-t border-gray-200 p-3 space-y-2">
                  <button
                    onClick={() => {
                      handleEditArticle(article.id, article.title);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200"
                  >
                    <Edit3 size={16} />
                    Edit in App
                  </button>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    <ExternalLink size={16} />
                    Open Google Doc
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Article Editor Modal */}
      {editModal.isOpen && editModal.articleId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={handleCloseEditor}
            />

            {/* Modal content */}
            <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit Article
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {editModal.articleTitle}
                  </p>
                </div>
                <button
                  onClick={handleCloseEditor}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Article Editor */}
              <div className="h-[70vh] overflow-hidden">
                <ArticleEditor
                  articleId={editModal.articleId}
                  className="h-full"
                  onSave={(content: string) => {
                    console.log('Article saved:', content);
                    // Optionally refresh the articles list or show a success message
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </UserDashboardLayout>
  );
};

export default GeneratedArticlesPage;
