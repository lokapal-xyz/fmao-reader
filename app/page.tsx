"use client";

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, X, Globe, Terminal, Lock, Unlock, BookOpen, ChevronRight, Database } from 'lucide-react';
import { useAccount, useReadContract, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { encodeFunctionData, parseEther } from 'viem';
import { base } from 'viem/chains';
import Image from 'next/image';
import { useViewProfile } from '@coinbase/onchainkit/minikit';
import ChapterPoll from '@/components/ChapterPoll';

// Configuration
const API_BASE_URL = 'https://www.lokapal.xyz/api';
const GRAPHQL_ENDPOINT = 'https://api.studio.thegraph.com/query/121796/plexus-archive-sepolia/v0.0.1';

// Contract addresses on Base Mainnet
const BOOK_TOKEN_CONTRACT = '0x4FEb9Fbc359400d477761cD67d80cF0ce43dd84F';
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

const TRANSLATIONS = {
  en: {
    toggle_lang: "LEER EN ESPAÑOL",
    mint_btn: "MINT BOOK",
    owned: "TOKEN OWNED",
    back: "BACK",
    back_to: "RETURN TO",
    archive: "ARCHIVE",
    index: "_INDEX",
    purge: "PURGE LOGS",
    accessed: "ACCESSED",
    plexus_archive: "Plexus Archive",
    shard_tag: "Shard Tag",
    echo_source: "Echo Source",
    earth: "Earth Time",
    lanka: "Lanka Time",
    archivist: "Archivist Log",
    close: "Close",
    retry: "RETRY",
    chapters_read: "CHAPTERS READ: ",
    init: "ACCESSING ARCHIVE...",
    archive_index: "ARCHIVE INDEX",
    select: "SELECT A VOLUME TO ACCESS ITS CHAPTERS",    
    support: "Support the author • Unlimited supply",
    chapter_archived: "CHAPTER ARCHIVED",
    mint_title: "Mint Book Token",
    checking: "CHECKING...",
    loading: "LOADING......",    
    loading_chapters: "LOADING CHAPTERS......",  
    decrypting: "DECRYPTING CHAPTERS......",  
    reveal: "REVEAL LOGS",
    err_mint: 'Minting failed: ',    
    err_generic: 'Please try again later.',
    err_funds: 'Insufficient ETH. Please add more ETH to your wallet.',
    err_rejected: 'Transaction rejected. Please try again.',
    err_init: 'Failed to initiate transaction. Please try again.',
    execute_mint: "EXECUTE MINT",  // USADOSSSSSSSSSS
    waiting_wallet: "WAITING FOR WALLET...",
    confirming: "CONFIRMING ON CHAIN...",
    success_title: "SUCCESS CONFIRMED",
    success_msg: (book: string) => `You now own ${book}. Thank you for your support.`,
    return_reading: "RETURN TO READING",
    error_title: "TRANSACTION FAILED",
    footer: "From Many, as One. A web serial by lokapal.eth",
    follow_author: "FOLLOW THE AUTHOR",
    poll_header: "READER SIGNAL DETECTED",
    poll_vote_btn: "SUBMIT VOTE",
    poll_requires_token: "Book Token required to vote",
    poll_voted: "SIGNAL TRANSMITTED",
    poll_your_choice: "Your choice:",
    poll_results: "AGGREGATE SIGNALS:",
    poll_total: "Total votes:",
    poll_loading: "LOADING POLL......",
    poll_submitting: "TRANSMITTING......",
    poll_error: "Failed to load poll",
    poll_vote_error: "Failed to submit vote",
    poll_retry: "RETRY",
    poll_no_wallet: "Connect wallet to vote",
  },
  es: {
    toggle_lang: "READ IN ENGLISH",
    mint_btn: "MINTEAR LIBRO",
    owned: "TOKEN ADQUIRIDO",
    back: "VOLVER",
    back_to: "VOLVER AL",
    archive: "ARCHIVO",
    index: "_INDICE",
    purge: "LIMPIAR REGISTROS",
    accessed: "ACCEDIDO",
    plexus_archive: "Archivo del Plexo",
    shard_tag: "Etiqueta de esquirla",
    echo_source: "Fuente del eco",
    earth: "Tiempo terrestre",
    lanka: "Tiempo de Lanka",
    archivist: "Registro del Archivista",
    close: "Cerrar",
    retry: "REINTENTAR",
    chapters_read: "CAPITULOS LEIDOS: ",
    init: "ACCEDIENDO ARCHIVO...",
    archive_index: "INDICE DEL ARCHIVO",
    select: "SELECCIONE UN VOLUMEN PARA ACCEDER A SUS CAPITULOS",    
    support: "Respalde al autor • Suministro ilimitado",
    chapter_archived: "CAPITULO ARCHIVADO",
    mint_title: "Mintear Token de Libro",
    checking: "CHEQUEANDO...",
    loading: "CARGANDO......",    
    loading_chapters: "CARGANDO CAPITULOS......",    
    decrypting: "DECIFRANDO CAPITULOS......",  
    reveal: "REVELAR REGISTROS",    
    err_mint: 'Minteo fallido: ',
    err_generic: 'Por favor, inténtalo de nuevo más tarde.',
    err_funds: 'ETH insuficiente. Por favor, añade más ETH a tu billetera.',
    err_rejected: 'Transacción rechazada. Por favor, inténtalo de nuevo.',
    err_init: 'No se inició la transacción. Por favor, inténtalo de nuevo.',
    execute_mint: "EJECUTAR MINTEO",
    waiting_wallet: "ESPERANDO BILLETERA...",
    confirming: "CONFIRMANDO EN CADENA...",
    success_title: "ÉXITO CONFIRMADO",
    success_msg: (book: string) => `Ahora posees el ${book.replace('Book', 'Libro')}. Gracias por tu apoyo.`,
    return_reading: "SEGUIR LEYENDO",
    error_title: "TRANSACCIÓN FALLIDA",
    footer: "From Many, as One. Un serial web de lokapal.eth",
    follow_author: "SEGUIR AL AUTOR",
    poll_header: "SEÑAL DE LECTOR DETECTADA",
    poll_vote_btn: "ENVIAR VOTO",
    poll_requires_token: "Token de Libro requerido para votar",
    poll_voted: "SEÑAL TRANSMITIDA",
    poll_your_choice: "Tu elección:",
    poll_results: "SEÑALES AGREGADAS:",
    poll_total: "Votos totales:",
    poll_loading: "CARGANDO ENCUESTA......",
    poll_submitting: "TRANSMITIENDO......",
    poll_error: "Error al cargar encuesta",
    poll_vote_error: "Error al enviar voto",
    poll_retry: "REINTENTAR",
    poll_no_wallet: "Conecta billetera para votar",
  }
};


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
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const { address } = useAccount();
  const viewProfile = useViewProfile();  
  const [mintingBookId, setMintingBookId] = useState<string | null>(null);
  const [lastMintedBookId, setLastMintedBookId] = useState<string | null>(null);

  // Wagmi hooks - #5: Added error handling
  const { data: hash, sendTransaction, isPending, error: sendError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess, isError: isConfirmError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    fetchBooks();
    loadReadProgress();
  }, [language]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
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

  // #6: Added timeout with AbortController
  const fetchChapters = async (bookId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE_URL}/books/${bookId}?lang=${language}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Failed to load chapters');
      const data = await response.json();
      setChapters(data.chapters);
      setSelectedBook(bookId);
      setViewMode('chapters');
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // #6: Added timeout with AbortController
  const fetchChapterContent = async (chapterId: string) => {
    if (!selectedBook) return;
    
    try {
      setContentLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE_URL}/books/${selectedBook}/chapters/${chapterId}?lang=${language}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Failed to load chapter');
      const data = await response.json();
      setSelectedChapter(data);
      setViewMode('content');

      window.scrollTo(0, 0);

      markAsRead(`${language}-${selectedBook}-${chapterId}`);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError('Failed to load content');
        }
      } else {
        setError('Failed to load content');
      }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    window.scrollTo(0, 0);
  };

  const goToChapters = () => {
    setViewMode('chapters');
    setSelectedChapter(null);
    window.scrollTo(0, 0);
  };

  // #6 & #7: Added timeout and GraphQL error checking
  const fetchPlexusEntry = async (title: string) => {
    try {
      setPlexusLoading(true);
      const cleanTitle = title.replace(/^[^:]+:\s*/, '');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
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

      clearTimeout(timeoutId);
      const result = await response.json();
      
      // #7 - Check for GraphQL errors
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return;
      }
      
      if (result.data?.entries?.[0]) {
        setPlexusEntry(result.data.entries[0]);
        setShowPlexusDialog(true);
      } else {
        console.error('No Plexus entry found for:', cleanTitle);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('Plexus query timed out');
      } else {
        console.error('Failed to fetch Plexus entry:', err);
      }
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

  // Handle successful mint
  useEffect(() => {
    if (isSuccess && hash && mintingBookId) {
      refetchBalance();
      
      setLastMintedBookId(mintingBookId);
      setShowMintDialog(false);
      setShowSuccessDialog(true);
      
      setMintingBookId(null);
    }
  }, [isSuccess, hash, mintingBookId, refetchBalance]);

  // #5 - Handle transaction errors
  useEffect(() => {
    if ((isConfirmError || sendError) && mintingBookId) {
      let errorMessage = TRANSLATIONS[language].err_generic;
      
      if (sendError?.message.includes('insufficient funds')) {
        errorMessage = TRANSLATIONS[language].err_funds;
      } else if (sendError?.message.includes('rejected')) {
        errorMessage = TRANSLATIONS[language].err_rejected;
      }
      
      setMintError(errorMessage);
      setShowMintDialog(false);
      setShowErrorDialog(true);
      setMintingBookId(null);
    }
  }, [isConfirmError, sendError, mintingBookId, language]);

  const mintBookToken = async () => {
    if (!selectedBook) return;

    try {
      setMintError(null);
      const bookIdNumber = getBookIdNumber(selectedBook);
      
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
      console.error(TRANSLATIONS[language].err_mint, err);
      setMintingBookId(null);
      setMintError(TRANSLATIONS[language].err_init);
      setShowMintDialog(false);
      setShowErrorDialog(true);
    }
  };

  // #12 - useMemo optimization
  const currentBookReadCount = useMemo(() => 
    selectedBook 
      ? Array.from(readChapters).filter(id => id.startsWith(`${language}-${selectedBook}-`)).length 
      : 0,
    [selectedBook, readChapters, language]
  );

  if (loading && viewMode === 'books') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Terminal style={{ width: '48px', height: '48px', color: '#22d3ee', margin: '0 auto 16px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          <p style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>{TRANSLATIONS[language].init}</p>
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
            {TRANSLATIONS[language].retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f1f5f9', position: 'relative' }}>
      {/* 1. Digital Grid (Slightly tighter and more visible) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px), 
          linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      {/* 2. CRT Scanlines (The "Flavor" addition) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%)',
        backgroundSize: '100% 4px',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.3
      }} />

      {/* 3. Deep Vignette (Creates depth) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 60%, rgba(2, 6, 23, 0.4) 100%)',
        pointerEvents: 'none',
        zIndex: 2
      }} />

      {/* Header (Note: z-index must be higher than background layers) */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        borderBottom: '1px solid rgba(34, 211, 238, 0.2)',
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
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
                    cursor: 'pointer'
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
                    {TRANSLATIONS[language].chapters_read}<span style={{ color: '#4ade80' }}>{currentBookReadCount}/{chapters.length}</span>
                  </span>
                )}
                
                {/* Separator and Language Toggle */}
                <button
                  onClick={toggleLanguage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(34, 211, 238, 0.1)',
                    border: '1px solid rgba(34, 211, 238, 0.3)',
                    color: '#22d3ee',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    cursor: 'pointer',
                    margin: '10px 0'
                  }}
                >
                  <Globe style={{ width: '14px', height: '14px' }} />
                  {TRANSLATIONS[language].toggle_lang}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px', position: 'relative' }}>
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
                {TRANSLATIONS[language].archive_index}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', fontFamily: 'monospace' }}>
                {TRANSLATIONS[language].select}
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
                {TRANSLATIONS[language].back_to}<br />{TRANSLATIONS[language].archive}
              </button>

              {/* 1. Only show the Mint button if the chain says they DON'T own it */}
              {selectedBook && !isActuallyOwned && !isBalanceLoading && (
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
                >
                  {TRANSLATIONS[language].mint_btn}<br />(0.002 ETH)
                </button>
              )}

              {/* #9 - Loading spinner for balance check */}
              {selectedBook && isBalanceLoading && (
                <div style={{
                  padding: '12px 24px',
                  background: 'rgba(34, 211, 238, 0.05)',
                  border: '2px solid rgba(34, 211, 238, 0.2)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Terminal style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: '#22d3ee',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} />
                  <span style={{
                    color: '#22d3ee',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {TRANSLATIONS[language].checking}
                  </span>
                </div>
              )}

              {/* 2. OWNED BADGE: Only show if the blockchain confirms ownership */}
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
                  {TRANSLATIONS[language].owned}
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Terminal style={{ width: '48px', height: '48px', color: '#22d3ee', marginBottom: '16px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <p style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>{TRANSLATIONS[language].loading_chapters}</p>
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
                                {TRANSLATIONS[language].accessed}
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
                  {TRANSLATIONS[language].purge}
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
                <p style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>{TRANSLATIONS[language].decrypting}</p>
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
                  {TRANSLATIONS[language].back_to}{TRANSLATIONS[language].index}
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
                  padding: '16px'
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
                    >
                      <Database style={{ width: '16px', height: '16px' }} />
                      {plexusLoading ? TRANSLATIONS[language].loading : TRANSLATIONS[language].reveal}
                    </button>
                  </div>

                  {/* ADD THE POLL COMPONENT HERE */}
                  {selectedChapter && selectedBook && (
                    <ChapterPoll 
                      bookId={selectedBook}
                      chapterId={selectedChapter.chapterId}
                      language={language}
                      isTokenOwned={isActuallyOwned}
                      userAddress={address}
                    />
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '32px',
                  borderTop: '1px solid #1e293b',
                  gap: '12px',
                  flexWrap: 'nowrap'               
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
                  >
                    ← {TRANSLATIONS[language].back}
                  </button>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle style={{ width: '20px', height: '20px', color: '#4ade80' }} />
                    <span style={{ fontSize: '14px', fontFamily: 'monospace', color: '#4ade80' }}>
                      {TRANSLATIONS[language].chapter_archived}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <footer style={{
          marginTop: '32px', // Reduced from 64px to bring it closer
          padding: '32px 20px 48px', // Balanced padding
          textAlign: 'center',
          borderTop: '1px solid rgba(34, 211, 238, 0.1)',
        }}>
          {/* The Legend */}
          <p style={{
            fontFamily: 'monospace',
            fontSize: '14px', // Increased from 12px
            letterSpacing: '0.05em',
            color: '#22d3ee',
            textTransform: 'uppercase',
            marginBottom: '16px',
            opacity: 0.8 // Increased from 0.7 for better visibility
          }}>
            {TRANSLATIONS[language].footer}
          </p>

          {/* The Follow Button */}
          <button 
            onClick={() => viewProfile(1394789)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px', // Slightly larger hit area for mobile
              background: 'rgba(133, 93, 205, 0.2)', 
              border: '1px solid rgba(133, 93, 205, 0.5)',
              borderRadius: '12px', // Slightly more "app-like" corner
              color: '#c4b5fd', // Lighter purple for better contrast
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '13px', // Increased from 11px
              fontWeight: 'bold',
              transition: 'all 0.2s',
              boxShadow: '0 0 15px rgba(133, 93, 205, 0.1)' // Very subtle glow
            }}
          >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
            {TRANSLATIONS[language].follow_author}
          </button>
        </footer>
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
                  {TRANSLATIONS[language].plexus_archive}
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
                    {TRANSLATIONS[language].shard_tag}
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
                    {TRANSLATIONS[language].echo_source}
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
                    {TRANSLATIONS[language].earth}
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
                    {TRANSLATIONS[language].lanka}
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
                  {TRANSLATIONS[language].archivist}
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
                >
                  {TRANSLATIONS[language].close}
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
                {TRANSLATIONS[language].mint_title}
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
                  {TRANSLATIONS[language].support}
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
              >
                {isPending 
                  ? TRANSLATIONS[language].waiting_wallet 
                  : isConfirming 
                    ? TRANSLATIONS[language].confirming 
                    : TRANSLATIONS[language].execute_mint}
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
              {TRANSLATIONS[language].success_title}
            </h3>
            
            <p style={{
              fontSize: '16px',
              color: '#cbd5e1',
              lineHeight: 1.6,
              marginBottom: '24px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {TRANSLATIONS[language].success_msg(
                lastMintedBookId?.replace('book-', language === 'es' ? 'Libro ' : 'Book ') || ''
              )}
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
            >
              {TRANSLATIONS[language].return_reading}
            </button>
          </div>
        </div>
      )}

      {/* Error Dialog */}
      {showErrorDialog && mintError && (
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
          onClick={() => setShowErrorDialog(false)}
        >
          <div 
            style={{
              background: '#0a1628',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%',
              padding: '32px',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <X style={{ width: '64px', height: '64px', color: '#ef4444', margin: '0 auto 24px' }} />
            
            <h3 style={{
              fontSize: '24px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: '#ef4444',
              marginBottom: '16px'
            }}>
              {TRANSLATIONS[language].error_title}
            </h3>
            
            <p style={{
              fontSize: '16px',
              color: '#cbd5e1',
              lineHeight: 1.6,
              marginBottom: '24px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {mintError}
            </p>

            <button
              onClick={() => setShowErrorDialog(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {TRANSLATIONS[language].close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}