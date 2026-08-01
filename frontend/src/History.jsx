import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaHistory, FaFilter, FaSort, FaTrash, FaDownload, FaImage, FaMicrophone, FaFileAlt } from 'react-icons/fa';

export default function History() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - Replace with actual data from your backend
  useEffect(() => {
    const mockHistory = [
      {
        id: 1,
        type: 'image',
        title: 'Background Removed Image',
        date: '2024-03-20T10:30:00',
        thumbnail: 'https://example.com/image1.jpg',
        downloadUrl: 'https://example.com/download1.png',
        tool: 'Background Remover'
      },
      {
        id: 2,
        type: 'audio',
        title: 'Voice Effect - Robot',
        date: '2024-03-19T15:45:00',
        thumbnail: null,
        downloadUrl: 'https://example.com/audio1.mp3',
        tool: 'Voice Changer'
      },
      {
        id: 3,
        type: 'image',
        title: 'AI Generated Art',
        date: '2024-03-18T09:15:00',
        thumbnail: 'https://example.com/image2.jpg',
        downloadUrl: 'https://example.com/download2.png',
        tool: 'Text to Image'
      }
    ];
    setHistory(mockHistory);
  }, []);

  const getToolIcon = (tool) => {
    switch (tool) {
      case 'Background Remover':
        return <FaImage className="w-5 h-5" />;
      case 'Voice Changer':
        return <FaMicrophone className="w-5 h-5" />;
      case 'Text to Image':
        return <FaFileAlt className="w-5 h-5" />;
      default:
        return <FaHistory className="w-5 h-5" />;
    }
  };

  const filteredHistory = history
    .filter(item => {
      if (filter === 'all') return true;
      return item.type === filter;
    })
    .filter(item => {
      if (!searchQuery) return true;
      return item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             item.tool.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date) - new Date(a.date);
      }
      return a.title.localeCompare(b.title);
    });

  const handleDelete = (id) => {
    setHistory(history.filter(item => item.id !== id));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white p-6 md:p-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            History
          </h1>
          <p className="text-lg text-gray-300">
            View and manage your AI tool usage history
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl"
        >
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-blue-900/50 border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 rounded-lg bg-blue-900/50 border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="audio">Audio</option>
              </select>
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

          {/* History List */}
          <div className="space-y-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No history items found
              </div>
            ) : (
              filteredHistory.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-4 bg-blue-900/30 rounded-xl hover:bg-blue-900/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-purple-900/50 flex items-center justify-center">
                        {getToolIcon(item.tool)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.tool}</p>
                    <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={item.downloadUrl}
                      download
                      className="p-2 text-green-400 hover:text-green-300 transition-colors"
                      title="Download"
                    >
                      <FaDownload className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <FaTrash className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
