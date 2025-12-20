"use client";

import { useState, useEffect } from 'react';
import { CheckCircle, X, Globe, Terminal, Lock, Unlock } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  other: {
    'base:app_id': '694701f9d19763ca26ddc747'
  }
};

// Configuration
const API_BASE_URL = 'https://www.lokapal.xyz/api';
const BOOK_ID = 'book-0';

// Types
interface Chapter {
  id: string;
  title: string;
  description: string;
}

interface ChapterContent {
  bookId: string;
  chapterId: string;
  lang: string;
  metadata: {
    title: string;
    description: string;
  };
  content: string;
}

type Language = 'en' | 'es';

export default function FMAOReader() {
  const [language, setLanguage] = useState<Language>('en');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
  const [selectedChapter, setSelectedChapter] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChapters();
    loadReadProgress();
  }, [language]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/books/${BOOK_ID}?lang=${language}`);
      if (!response.ok) throw new Error('Failed to load chapters');
      const data = await response.json();
      setChapters(data.chapters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterContent = async (chapterId: string) => {
    try {
      setContentLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/books/${BOOK_ID}/chapters/${chapterId}?lang=${language}`);
      if (!response.ok) throw new Error('Failed to load chapter');
      const data = await response.json();
      setSelectedChapter(data);
      markAsRead(`${language}-${chapterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setContentLoading(false);
    }
  };

  const loadReadProgress = () => {
    try {
      const saved = localStorage.getItem('fmao_read_chapters');
      if (saved) {
        setReadChapters(new Set(JSON.parse(saved)));
      }
    } catch (err) {
      console.error('Failed to load progress:', err);
    }
  };

  const markAsRead = (chapterId: string) => {
    setReadChapters(prev => {
      const updated = new Set(prev);
      updated.add(chapterId);
      try {
        localStorage.setItem('fmao_read_chapters', JSON.stringify(Array.from(updated)));
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
      return updated;
    });
  };

  const resetProgress = () => {
    setReadChapters(new Set());
    localStorage.removeItem('fmao_read_chapters');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
    setSelectedChapter(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Terminal style={{ width: '48px', height: '48px', color: '#22d3ee', margin: '0 auto 16px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          <p style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>INITIALIZING PLEXUS ARCHIVE...</p>
        </div>
      </div>
    );
  }

  if (error && chapters.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(127, 29, 29, 0.2)', padding: '32px', borderRadius: '8px' }}>
          <p style={{ color: '#f87171', marginBottom: '16px', fontFamily: 'monospace' }}>ERROR: {error}</p>
          <button
            onClick={fetchChapters}
            style={{ padding: '8px 24px', background: '#dc2626', color: 'white', borderRadius: '4px', fontFamily: 'monospace', border: 'none', cursor: 'pointer' }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const currentLangReadCount = Array.from(readChapters).filter(id => id.startsWith(`${language}-`)).length;

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#f1f5f9', position: 'relative' }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        pointerEvents: 'none'
      }} />
      
      {/* Vignette */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        borderBottom: '1px solid rgba(34, 211, 238, 0.2)',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Terminal style={{ width: '24px', height: '24px', color: '#22d3ee' }} />
                <h1 style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 'bold', background: 'linear-gradient(to right, #22d3ee, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                  FROM MANY AS ONE
                </h1>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b', padding: '4px 8px', border: '1px solid #334155', borderRadius: '4px' }}>
                  BOOK_0
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontFamily: 'monospace' }}>
                <span style={{ color: 'rgba(34, 211, 238, 0.7)' }}>
                  STATUS: <span style={{ color: '#4ade80' }}>ONLINE</span>
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <span style={{ color: '#94a3b8' }}>
                  SHARDS_ACCESSED: {currentLangReadCount}/{chapters.length}
                </span>
              </div>
            </div>
            
            <button
              onClick={toggleLanguage}
              style={{
                padding: '8px 16px',
                background: '#0f172a',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Globe style={{ width: '16px', height: '16px', color: '#22d3ee' }} />
              <span style={{ color: '#67e8f9', fontWeight: 'bold' }}>
                {language.toUpperCase()}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px', position: 'relative' }}>
        {!selectedChapter ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chapters.map((chapter, ) => {
                const isRead = readChapters.has(`${language}-${chapter.id}`);
                return (
                  <button
                    key={chapter.id}
                    onClick={() => fetchChapterContent(chapter.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '24px',
                      borderRadius: '8px',
                      background: 'rgba(2, 6, 23, 0.5)',
                      border: '1px solid rgba(30, 41, 59, 0.5)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.5)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ flexShrink: 0, paddingTop: '4px' }}>
                        {isRead ? (
                          <Unlock style={{ width: '20px', height: '20px', color: '#4ade80' }} />
                        ) : (
                          <Lock style={{ width: '20px', height: '20px', color: '#475569' }} />
                        )}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <h3 style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                            {chapter.title}
                          </h3>
                          {isRead && (
                            <span style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              color: '#4ade80',
                              padding: '2px 8px',
                              border: '1px solid rgba(74, 222, 128, 0.3)',
                              borderRadius: '4px',
                              background: 'rgba(74, 222, 128, 0.05)'
                            }}>
                              ACCESSED
                            </span>
                          )}
                        </div>
                        {chapter.description && (
                          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                            {chapter.description}
                          </p>
                        )}
                      </div>
                      
                      <div style={{ flexShrink: 0, color: 'rgba(34, 211, 238, 0.5)', fontFamily: 'monospace', fontSize: '12px', paddingTop: '4px' }}>
                        →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {readChapters.size > 0 && (
              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={resetProgress}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#64748b',
                    border: '1px solid #1e293b',
                    borderRadius: '4px',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.borderColor = '#1e293b';
                  }}
                >
                  PURGE_ACCESS_LOGS
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {contentLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Terminal style={{ width: '48px', height: '48px', color: '#22d3ee', marginBottom: '16px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <p style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>DECRYPTING SHARD...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <button
                  onClick={() => setSelectedChapter(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#94a3b8',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#22d3ee'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  <X style={{ width: '16px', height: '16px' }} />
                  RETURN_TO_INDEX
                </button>

                <div style={{
                  border: '1px solid rgba(34, 211, 238, 0.2)',
                  background: 'rgba(2, 6, 23, 0.5)',
                  borderRadius: '8px',
                  padding: '32px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '128px',
                    height: '128px',
                    background: 'rgba(34, 211, 238, 0.05)',
                    filter: 'blur(48px)'
                  }} />
                  
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <h2 style={{
                          fontSize: '30px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          background: 'linear-gradient(to right, #22d3ee, #60a5fa)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          marginBottom: '12px'
                        }}>
                          {selectedChapter.metadata.title}
                        </h2>
                        {selectedChapter.metadata.description && (
                          <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                            {selectedChapter.metadata.description}
                          </p>
                        )}
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        padding: '4px 12px',
                        background: 'rgba(34, 211, 238, 0.1)',
                        color: '#22d3ee',
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        borderRadius: '20px',
                        flexShrink: 0
                      }}>
                        {selectedChapter.lang.toUpperCase()}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>
                      <Terminal style={{ width: '12px', height: '12px' }} />
                      <span>CLASSIFICATION: PUBLIC_ARCHIVE</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  background: 'rgba(2, 6, 23, 0.3)',
                  borderRadius: '8px',
                  padding: '32px'
                }}>
                  <style dangerouslySetInnerHTML={{ __html: `
                    .content-area p { margin-bottom: 24px; line-height: 1.8; color: #cbd5e1; }
                    .content-area em { font-style: italic; color: #67e8f9; }
                    .content-area strong { font-weight: bold; color: #fff; }
                    .content-area hr { border: 0; border-top: 1px solid #334155; margin: 32px 0; }
                    .content-area h1 { color: #22d3ee; font-family: monospace; margin-bottom: 24px; font-size: 24px; }
                    .content-area h2 { color: #22d3ee; font-family: monospace; margin-bottom: 16px; font-size: 20px; }
                    .content-area h3 { color: #22d3ee; font-family: monospace; margin-bottom: 12px; font-size: 18px; }
                  `}} />
                  <div 
                    className="content-area"
                    dangerouslySetInnerHTML={{ __html: selectedChapter.content }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '32px',
                  borderTop: '1px solid #1e293b'
                }}>
                  <button
                    onClick={() => setSelectedChapter(null)}
                    style={{
                      padding: '12px 24px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#cbd5e1',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)';
                      e.currentTarget.style.color = '#22d3ee';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.color = '#cbd5e1';
                    }}
                  >
                    ← BACK
                  </button>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle style={{ width: '20px', height: '20px', color: '#4ade80' }} />
                    <span style={{ fontSize: '14px', fontFamily: 'monospace', color: '#4ade80' }}>
                      SHARD_ARCHIVED
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}