"use client";

import { useState, useEffect } from 'react';
import { CheckCircle, X, Globe, Terminal, Lock, Unlock, BookOpen, ChevronRight, Database } from 'lucide-react';
import { useAccount, useReadContract, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { encodeFunctionData, parseEther } from 'viem';
import { base } from 'viem/chains';
import Image from 'next/image';

// Configuration
const API_BASE_URL = 'https://www.lokapal.xyz/api';
const GRAPHQL_ENDPOINT = 'https://api.studio.thegraph.com/query/121796/plexus-archive-sepolia/v0.0.1';

// Contract addresses on Base Mainnet
const BOOK_TOKEN_CONTRACT = '0x4FEb9Fbc359400d477761cD67d80cF0ce43dd84F'; // TODO: Update with deployed mainnet address
const BOOK_PRICE_ETH = '0.002'; // 0.002 ETH per book

// IPFS Configuration
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const BOOK_IMAGES_CID = 'bafybeiaouhewkf6j7qcfmjofrwc74gp23hni7pqvxbccnppnz5igbxb6tq';

// Contract ABI for mintBook function
const MINT_BOOK_ABI = [
  {
    name: 'mintBook',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'bookId', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  }
] as const;

// Add balanceOf to your ABI constants
const BOOK_TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

// Types
interface BookDefinition {
  id: string;
  title: {
    en: string;
    es: string;
  };
  description: {
    en: string;
    es: string;
  };
}

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

interface PlexusEntry {
  id: string;
  entryIndex: string;
  title: string;
  source: string;
  timestamp1: string;
  timestamp2: string;
  curatorNote: string;
  versionIndex: string;
  nftAddress: string;
  nftId: string;
  contentHash: string;
  permawebLink: string;
  license: string;
  deprecated: boolean;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

type Language = 'en' | 'es';
type ViewMode = 'books' | 'chapters' | 'content';

export default function FMAOReader() {
  const [language, setLanguage] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<ViewMode>('books');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [books, setBooks] = useState<BookDefinition[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
  const [selectedChapter, setSelectedChapter] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlexusDialog, setShowPlexusDialog] = useState(false);
  const [plexusEntry, setPlexusEntry] = useState<PlexusEntry | null>(null);
  const [plexusLoading, setPlexusLoading] = useState(false);
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [mintedBooks, setMintedBooks] = useState<Set<string>>(new Set());
  const { address } = useAccount();
  const [mintingBookId, setMintingBookId] = useState<string | null>(null);
  const [lastMintedBookId, setLastMintedBookId] = useState<string | null>(null);

  // Wagmi hooks
  const { data: hash, sendTransaction, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    fetchBooks();
    loadReadProgress();
    loadMintedBooks();
  }, [language]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      // For now, we'll manually define the books
      // In the future, you can create an API endpoint to list all books
      const bookList: BookDefinition[] = [
        {
          id: 'book-0',
          title: {
            en: 'Book 0: From the Plexus',
            es: 'Libro 0: Desde el Plexo'
          },
          description: {
            en: 'A journey through each Lanka Prime district',
            es: 'Un viaje a través de cada distrito de Lanka Prime'
          }
        },
        {
          id: 'book-1',
          title: {
            en: 'Book 1: Shadows over Lanka Prime',
            es: 'Libro 1: Sombras sobre Lanka Prime'
          },
          description: {
            en: 'After the Ghrina massacre, the Council will not be the same',
            es: 'Después de la masacre de Ghrina, el Consejo no será el mismo'
          }
        }
      ];
      setBooks(bookList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async (bookId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/books/${bookId}?lang=${language}`);
      if (!response.ok) throw new Error('Failed to load chapters');
      const data = await response.json();
      setChapters(data.chapters);
      setSelectedBook(bookId);
      setViewMode('chapters');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterContent = async (chapterId: string) => {
    if (!selectedBook) return;
    
    try {
      setContentLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/books/${selectedBook}/chapters/${chapterId}?lang=${language}`);
      if (!response.ok) throw new Error('Failed to load chapter');
      const data = await response.json();
      setSelectedChapter(data);
      setViewMode('content');
      markAsRead(`${language}-${selectedBook}-${chapterId}`);
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

  const loadMintedBooks = () => {
    try {
      const saved = localStorage.getItem('fmao_minted_books');
      if (saved) {
        setMintedBooks(new Set(JSON.parse(saved)));
      }
    } catch (err) {
      console.error('Failed to load minted books:', err);
    }
  };

  const saveMintedBook = (bookId: string) => {
    setMintedBooks(prev => {
      const updated = new Set(prev);
      updated.add(bookId);
      try {
        localStorage.setItem('fmao_minted_books', JSON.stringify(Array.from(updated)));
      } catch (err) {
        console.error('Failed to save minted book:', err);
      }
      return updated;
    });
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
    setViewMode('books');
    setSelectedChapter(null);
    setSelectedBook(null);
  };

  const goToBooks = () => {
    setViewMode('books');
    setSelectedChapter(null);
    setSelectedBook(null);
  };

  const goToChapters = () => {
    setViewMode('chapters');
    setSelectedChapter(null);
  };

  const fetchPlexusEntry = async (title: string) => {
    try {
      setPlexusLoading(true);
      // Remove everything before and including the colon, plus any whitespace after
      // This handles "Shard X:", "Chapter X:", "Interlude X:", etc.
      const cleanTitle = title.replace(/^[^:]+:\s*/, '');
      
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetChapterByTitle($title: String!) {
              entries(
                where: { 
                  title: $title, 
                  deprecated: false 
                }
                orderBy: versionIndex
                orderDirection: desc
                first: 1
              ) {
                id
                entryIndex
                title
                source
                timestamp1
                timestamp2
                curatorNote
                versionIndex
                nftAddress
                nftId
                contentHash
                permawebLink
                license
                deprecated
                blockNumber
                blockTimestamp
                transactionHash
              }
            }
          `,
          variables: { title: cleanTitle }
        })
      });

      const result = await response.json();
      if (result.data?.entries?.[0]) {
        setPlexusEntry(result.data.entries[0]);
        setShowPlexusDialog(true);
      } else {
        console.error('No Plexus entry found for:', cleanTitle);
      }
    } catch (err) {
      console.error('Failed to fetch Plexus entry:', err);
    } finally {
      setPlexusLoading(false);
    }
  };

  const openPlexusDialog = () => {
    if (selectedChapter?.metadata.title) {
      fetchPlexusEntry(selectedChapter.metadata.title);
    }
  };

  const getBookImageUrl = (bookId: string) => {
    const bookNumber = bookId.replace('book-', '');
    return `${IPFS_GATEWAY}${BOOK_IMAGES_CID}/book-${bookNumber}.gif`;
  };

  const getBookIdNumber = (bookId: string) => {
    return parseInt(bookId.replace('book-', ''));
  };

  // Hook to check if the user owns the currently selected book
const { data: balance, refetch: refetchBalance, isLoading: isBalanceLoading } = useReadContract({
    address: BOOK_TOKEN_CONTRACT as `0x${string}`,
    abi: BOOK_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address && selectedBook ? [address, BigInt(getBookIdNumber(selectedBook))] : undefined,
    query: {
      enabled: !!address && !!selectedBook,
    }
  });

  const isActuallyOwned = balance ? Number(balance) > 0 : false;

  // Handle successful mint. Updated Success Effect
  useEffect(() => {
    // We check for mintingBookId to ensure this effect ONLY fires once per transaction
    if (isSuccess && hash && mintingBookId) {
      refetchBalance(); // Update on-chain truth
      saveMintedBook(mintingBookId); // Update local cache
      
      setLastMintedBookId(mintingBookId); // Lock the ID for the Success Dialog
      setShowMintDialog(false);
      setShowSuccessDialog(true);
      
      // IMPORTANT: Reset mintingBookId here. 
      // This "disarms" the effect so it won't fire again even if isSuccess remains true.
      setMintingBookId(null); 
    }
  }, [isSuccess, hash, mintingBookId, refetchBalance]);

  const mintBookToken = async () => {
    if (!selectedBook) return;

    try {
      const bookIdNumber = getBookIdNumber(selectedBook);
      
      // Set this BEFORE sending the transaction
      setMintingBookId(selectedBook); 

      const data = encodeFunctionData({
        abi: MINT_BOOK_ABI,
        functionName: 'mintBook',
        args: [BigInt(bookIdNumber), BigInt(1)]
      });

      sendTransaction({
        to: BOOK_TOKEN_CONTRACT as `0x${string}`,
        data,
        value: parseEther(BOOK_PRICE_ETH),
        chainId: base.id
      });

    } catch (err) {
      console.error('Minting failed:', err);
      setMintingBookId(null); // Reset on immediate failure
      alert('Minting failed. Please try again.');
    }
  };

  if (loading && viewMode === 'books') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Terminal style={{ width: '48px', height: '48px', color: '#22d3ee', margin: '0 auto 16px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          <p style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>INITIALIZING PLEXUS ARCHIVE...</p>
        </div>
      </div>
    );
  }

  if (error && books.length === 0 && viewMode === 'books') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(127, 29, 29, 0.2)', padding: '32px', borderRadius: '8px' }}>
          <p style={{ color: '#f87171', marginBottom: '16px', fontFamily: 'monospace' }}>ERROR: {error}</p>
          <button
            onClick={fetchBooks}
            style={{ padding: '8px 24px', background: '#dc2626', color: 'white', borderRadius: '4px', fontFamily: 'monospace', border: 'none', cursor: 'pointer' }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const currentBookReadCount = selectedBook 
    ? Array.from(readChapters).filter(id => id.startsWith(`${language}-${selectedBook}-`)).length 
    : 0;

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
            <div style={{ flex: 1 }}>
              {/* Title Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Terminal style={{ width: '24px', height: '24px', color: '#22d3ee' }} />
                <h1 
                  style={{ 
                    fontSize: '24px', 
                    fontFamily: 'monospace', 
                    fontWeight: 'bold', 
                    background: 'linear-gradient(to right, #22d3ee, #60a5fa)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent', 
                    margin: 0,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={goToBooks}
                >
                  FROM MANY AS ONE
                </h1>
              </div>
              
              {/* Metadata and Language Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontFamily: 'monospace' }}>
                {viewMode === 'chapters' && (
                  <span style={{ color: 'rgba(34, 211, 238, 0.7)' }}>
                    CHAPTERS_READ: <span style={{ color: '#4ade80' }}>{currentBookReadCount}/{chapters.length}</span>
                  </span>
                )}
                
                {/* Separator and Language Toggle
                <span style={{ color: '#475569' }}>|</span> */}
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
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px', position: 'relative' }}>
        {/* Books View */}
        {viewMode === 'books' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{
                fontSize: '36px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #22d3ee, #60a5fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '16px'
              }}>
                ARCHIVE_INDEX
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', fontFamily: 'monospace' }}>
                SELECT A VOLUME TO ACCESS ITS CHAPTERS
              </p>
            </div>

            <div style={{ display: 'grid', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
              {books.map((book) => (
              <button
                key={book.id}
                onClick={() => fetchChapters(book.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '24px', // Slightly reduced padding for mobile
                  borderRadius: '12px',
                  background: 'rgba(2, 6, 23, 0.7)',
                  border: '1px solid rgba(34, 211, 238, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '120px', // Ensures consistent height
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Background Watermark Icon */}
                <BookOpen 
                  style={{ 
                    position: 'absolute',
                    right: '-10px',
                    bottom: '-10px',
                    width: '100px',
                    height: '100px',
                    color: 'rgba(34, 211, 238, 0.07)', // Very subtle cyan
                    transform: 'rotate(-15deg)',
                    pointerEvents: 'none'
                  }} 
                />
                
                <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontFamily: 'monospace',
                      fontSize: '20px', // Scaled down slightly for mobile
                      fontWeight: 'bold',
                      color: '#f1f5f9',
                      marginBottom: '4px'
                    }}>
                      {book.title[language]}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#94a3b8',
                      lineHeight: 1.4,
                      margin: 0,
                      maxWidth: '90%' // Keeps text from hitting the edge
                    }}>
                      {book.description[language]}
                    </p>
                  </div>
                  
                  <ChevronRight style={{ width: '20px', height: '20px', color: 'rgba(34, 211, 238, 0.5)', flexShrink: 0 }} />
                </div>
              </button>
              ))}
            </div>
          </div>
        )}

        {/* Chapters View */}
        {viewMode === 'chapters' && !selectedChapter && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <button
                onClick={goToBooks}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#22d3ee', // Brighter cyan
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  background: 'rgba(34, 211, 238, 0.05)',
                  border: 'none',
                  borderLeft: '2px solid #22d3ee',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  borderRadius: '0 4px 4px 0'
                }}
              >
                <X style={{ width: '14px', height: '14px' }} />
                RETURN<br />TO_ARCHIVE
              </button>

              {selectedBook && !mintedBooks.has(selectedBook) && (
                <button
                  onClick={() => setShowMintDialog(true)}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(96, 165, 250, 0.2))',
                    border: '2px solid rgba(34, 211, 238, 0.4)',
                    color: '#22d3ee',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.4)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  MINT<br />BOOK_TOKEN<br />(0.002 ETH)
                </button>
              )}

              {selectedBook && isActuallyOwned && !isBalanceLoading && (
                <div style={{
                  padding: '12px 24px',
                  background: 'rgba(74, 222, 128, 0.1)',
                  border: '2px solid rgba(74, 222, 128, 0.3)',
                  color: '#4ade80',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle style={{ width: '16px', height: '16px' }} />
                  TOKEN_OWNED
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Terminal style={{ width: '48px', height: '48px', color: '#22d3ee', marginBottom: '16px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <p style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>LOADING SHARDS...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chapters.map((chapter) => {
                  const isRead = readChapters.has(`${language}-${selectedBook}-${chapter.id}`);
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
            )}

            {readChapters.size > 0 && (
              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={resetProgress}
                  style={{
                    padding: '8px 16px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#f87171', // Red
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: 'none',
                    borderLeft: '2px solid #ef4444',
                    borderRadius: '0 4px 4px 0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Terminal style={{ width: '12px', height: '12px' }} />
                  PURGE_ACCESS_LOGS
                </button>
              </div>
            )}
          </>
        )}

        {/* Content View */}
        {viewMode === 'content' && selectedChapter && (
          <>
            {contentLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Terminal style={{ width: '48px', height: '48px', color: '#22d3ee', marginBottom: '16px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <p style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>DECRYPTING SHARD...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <button
                  onClick={goToChapters}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#22d3ee',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    background: 'rgba(34, 211, 238, 0.05)',
                    border: 'none',
                    borderLeft: '2px solid #22d3ee',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    borderRadius: '0 4px 4px 0'
                  }}
                >
                  <X style={{ width: '14px', height: '14px' }} />
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
                    .content-area em { font-style: italic; color: #4ade80; }
                    .content-area strong { font-weight: bold; color: #60a5fa; }
                    .content-area hr { border: 0; border-top: 1px solid #334155; margin: 32px 0; }
                    .content-area h1 { color: #22d3ee; font-family: monospace; margin-bottom: 24px; font-size: 24px; }
                    .content-area h2 { color: #22d3ee; font-family: monospace; margin-bottom: 16px; font-size: 20px; }
                    .content-area h3 { color: #22d3ee; font-family: monospace; margin-bottom: 12px; font-size: 18px; }
                  `}} />
                  <div 
                    className="content-area"
                    dangerouslySetInnerHTML={{ __html: selectedChapter.content }}
                  />

                  {/* Reveal Logs Button - Right after content */}
                  <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={openPlexusDialog}
                      disabled={plexusLoading}
                      style={{
                        padding: '16px 32px',
                        background: 'rgba(34, 211, 238, 0.1)',
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        color: '#22d3ee',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: plexusLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: plexusLoading ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!plexusLoading) {
                          e.currentTarget.style.background = 'rgba(34, 211, 238, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.3)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Database style={{ width: '16px', height: '16px' }} />
                      {plexusLoading ? 'LOADING...' : 'REVEAL_LOGS'}
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '32px',
                  borderTop: '1px solid #1e293b'
                }}>
                  <button
                    onClick={goToChapters}
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
                      CHAPTER_ARCHIVED
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Plexus Archive Dialog */}
      {showPlexusDialog && plexusEntry && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowPlexusDialog(false)}
        >
          <div 
            style={{
              background: '#0a1628',
              border: '2px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(34, 211, 238, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: '#0a1628',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database style={{ width: '24px', height: '24px', color: '#22d3ee' }} />
                <h3 style={{
                  fontSize: '20px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  background: 'linear-gradient(to right, #22d3ee, #60a5fa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0
                }}>
                  Plexus Archive
                </h3>
              </div>
              <button
                onClick={() => setShowPlexusDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#22d3ee'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <X style={{ width: '24px', height: '24px' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                marginBottom: '24px'
              }}>
                {/* Shard Tag */}
                <div style={{
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#64748b',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Shard Tag
                  </div>
                  <div style={{
                    fontSize: '15px',
                    color: '#f1f5f9',
                    fontFamily: 'monospace',
                    fontWeight: 500
                  }}>
                    {plexusEntry.title}
                  </div>
                </div>

                {/* Echo Source */}
                <div style={{
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#64748b',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Echo Source
                  </div>
                  <div style={{
                    fontSize: '15px',
                    color: '#f1f5f9',
                    fontFamily: 'monospace',
                    fontWeight: 500
                  }}>
                    {plexusEntry.source}
                  </div>
                </div>

                {/* Earth Time */}
                <div style={{
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#64748b',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Earth Time
                  </div>
                  <div style={{
                    fontSize: '15px',
                    color: '#f1f5f9',
                    fontFamily: 'monospace',
                    fontWeight: 500
                  }}>
                    {plexusEntry.timestamp1}
                  </div>
                </div>

                {/* Lanka Time */}
                <div style={{
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#64748b',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Lanka Time
                  </div>
                  <div style={{
                    fontSize: '15px',
                    color: '#f1f5f9',
                    fontFamily: 'monospace',
                    fontWeight: 500
                  }}>
                    {plexusEntry.timestamp2}
                  </div>
                </div>
              </div>

              {/* Archivist Log */}
              <div style={{
                background: 'rgba(2, 6, 23, 0.5)',
                border: '1px solid rgba(30, 41, 59, 0.5)',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#64748b',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Archivist Log
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#cbd5e1',
                  lineHeight: 1.7,
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  {plexusEntry.curatorNote}
                </div>
              </div>

              {/* Close button */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowPlexusDialog(false)}
                  style={{
                    padding: '12px 32px',
                    background: 'rgba(34, 211, 238, 0.1)',
                    border: '1px solid rgba(34, 211, 238, 0.3)',
                    color: '#22d3ee',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 211, 238, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.3)';
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mint Book Token Dialog */}
      {showMintDialog && selectedBook && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => !isPending && !isConfirming && setShowMintDialog(false)}
        >
          <div 
            style={{
              background: '#0a1628',
              border: '2px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '12px',
              maxWidth: '840px',
              width: '100%',
              position: 'relative',
              margin: '0 auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(34, 211, 238, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #22d3ee, #60a5fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>
                Mint Book Token
              </h3>
              {!isPending && !isConfirming && (
                <button
                  onClick={() => setShowMintDialog(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#22d3ee'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  <X style={{ width: '24px', height: '24px' }} />
                </button>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              {/* Book Token Image */}
              <div style={{
                width: '100%',
                aspectRatio: '4 / 3', // Maintains the 800x600 proportion                marginBottom: '24px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid rgba(34, 211, 238, 0.3)',
                background: '#000',
                position: 'relative'
              }}>
                <Image 
                  src={getBookImageUrl(selectedBook)}
                  alt={`${selectedBook} token`}
                  fill
                  style={{ objectFit: 'contain' }}
                  unoptimized
                />
              </div>

              {/* Book Info */}
              <div style={{
                background: 'rgba(2, 6, 23, 0.5)',
                border: '1px solid rgba(30, 41, 59, 0.5)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'monospace' }}>
                  {books.find(b => b.id === selectedBook)?.title[language]}
                </div>
                <div style={{ fontSize: '24px', color: '#22d3ee', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  0.002 ETH
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', fontFamily: 'monospace' }}>
                  Support the author • Unlimited supply
                </div>
              </div>

              {/* Mint Button */}
              <button
                onClick={mintBookToken}
                disabled={isPending || isConfirming}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: (isPending || isConfirming) ? 'rgba(34, 211, 238, 0.1)' : 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(96, 165, 250, 0.2))',
                  border: '2px solid rgba(34, 211, 238, 0.4)',
                  color: '#22d3ee',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: (isPending || isConfirming) ? 'not-allowed' : 'pointer',
                  opacity: (isPending || isConfirming) ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isPending && !isConfirming) {
                    e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.4)';
                }}
              >
                {isPending ? 'CONFIRM IN WALLET...' : isConfirming ? 'CONFIRMING...' : 'CONFIRM MINT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && lastMintedBookId && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowSuccessDialog(false)}
        >
          <div 
            style={{
              background: '#0a1628',
              border: '2px solid rgba(74, 222, 128, 0.4)',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%',
              padding: '32px',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CheckCircle style={{ width: '64px', height: '64px', color: '#4ade80', margin: '0 auto 24px' }} />
            
            <h3 style={{
              fontSize: '24px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: '#4ade80',
              marginBottom: '16px'
            }}>
              SUCCESS_CONFIRMED
            </h3>
            
            <p style={{
              fontSize: '16px',
              color: '#cbd5e1',
              lineHeight: 1.6,
              marginBottom: '24px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              You now own {lastMintedBookId.replace('book-', 'Book ')}.<br/>Thank you for your support!
            </p>

            <button
              onClick={() => setShowSuccessDialog(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(74, 222, 128, 0.2)',
                border: '1px solid rgba(74, 222, 128, 0.4)',
                color: '#4ade80',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(74, 222, 128, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)';
              }}
            >
              CONTINUE_READING
            </button>
          </div>
        </div>
      )}
    </div>
  );
}