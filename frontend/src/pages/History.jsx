import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaHistory, FaFilter, FaSearch, FaImage, FaMicrophone, FaFileAlt, FaSync, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import apiClient from '../lib/apiClient';
import { extractErrorMessage } from '../lib/api';

const PAGE_SIZE = 20;
// The API clamps `limit` to 100 rows: that is the window a client-side
// search/filter runs over while one is active.
const FILTER_WINDOW = 100;

// Server feature keys → display metadata (the allow-list lives in
// backend/lib/validators.js; anything unknown falls back to a generic row).
const FEATURE_META = {
  'text-to-image': { label: 'Text to Image', type: 'image', Icon: FaImage },
  'remove-bg': { label: 'Background Remover', type: 'image', Icon: FaImage },
  'voice-changer': { label: 'Voice Changer', type: 'audio', Icon: FaMicrophone },
  'text-to-speech': { label: 'Text to Speech', type: 'audio', Icon: FaMicrophone },
  'text-summarizer': { label: 'Text Summarizer', type: 'text', Icon: FaFileAlt },
};

function metaFor(feature) {
  return FEATURE_META[feature] || { label: feature, type: 'text', Icon: FaHistory };
}

export default function History() {
  const [items, setItems] = useState([]);
  const [scope, setScope] = useState('own');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering/sorting is applied in the browser, so with a filter active the
  // list must come from one wide window instead of a single 20-row page —
  // otherwise matches sitting on other pages would simply be invisible.
  const isFiltering = filter !== 'all' || searchQuery.trim() !== '';

  const loadHistory = useCallback(async (pageIndex, filtering) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/feature-usage', {
        params: filtering
          ? { limit: FILTER_WINDOW, offset: 0 }
          : { limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE },
      });
      setItems(Array.isArray(res.data.usage) ? res.data.usage : []);
      setScope(res.data.scope || 'own');
      setTotal(res.data.pagination?.total ?? (res.data.usage || []).length);
    } catch (err) {
      setError(await extractErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // A filter can empty the page we are on; park the pager first so it never
    // points past the last page (that showed "Page 2 of 1" over an empty list).
    if (isFiltering && page !== 0) {
      setPage(0);
      return;
    }
    loadHistory(page, isFiltering);
  }, [page, isFiltering, loadHistory]);

  const filteredItems = items
    .filter((item) => {
      if (filter === 'all') return true;
      return metaFor(item.feature).type === filter;
    })
    .filter((item) => {
      if (!searchQuery) return true;
      const meta = metaFor(item.feature);
      const haystack = `${meta.label} ${item.feature} ${item.name || ''} ${item.email || ''}`.toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'title') {
        return metaFor(a.feature).label.localeCompare(metaFor(b.feature).label);
      }
      return new Date(b.used_at) - new Date(a.used_at);
    });

  const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white p-6 md:p-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 gradient-title">
            History
          </h1>
          <p className="text-lg text-gray-300">
            {scope === 'all'
              ? 'Usage history for every account (admin view)'
              : 'Your AI tool usage history'}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl"
        >
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-blue-900/50 border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <FaFilter />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-blue-900/50 border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  <option value="image">Images</option>
                  <option value="audio">Audio</option>
                  <option value="text">Text</option>
                </select>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg bg-blue-900/50 border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>

          {/* Status */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* History List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-300" role="status">
                <FaSync className="inline animate-spin mr-2" />
                Loading history…
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {items.length === 0
                  ? 'No usage recorded yet — generate an image or summarize some text and it will show up here.'
                  : 'No history items match your filters.'}
              </div>
            ) : (
              filteredItems.map((item) => {
                const meta = metaFor(item.feature);
                const Icon = meta.Icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 bg-blue-900/30 rounded-xl hover:bg-blue-900/50 transition-colors"
                  >
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-purple-900/50 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{meta.label}</h3>
                      <p className="text-sm text-gray-400">
                        {scope === 'all'
                          ? `${item.name || 'Unknown'} · ${item.email || ''}`
                          : meta.label}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(item.used_at)}</p>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-purple-300/80">
                      {meta.type}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Pagination (server-side). Hidden while a filter/search is active:
              that list is loaded as one wide window, not page by page. */}
          {!isFiltering && total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-8 text-sm text-gray-300">
              <span>
                {filteredItems.length} shown · {total} total
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="px-3 py-2 rounded-lg bg-blue-900/50 border border-purple-500 disabled:opacity-40 hover:bg-blue-900/80"
                  aria-label="Previous page"
                >
                  <FaChevronLeft />
                </button>
                <span className="px-3 py-2">
                  Page {page + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1 || loading}
                  className="px-3 py-2 rounded-lg bg-blue-900/50 border border-purple-500 disabled:opacity-40 hover:bg-blue-900/80"
                  aria-label="Next page"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
