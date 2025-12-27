"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lock, CheckCircle, BarChart3, Users } from 'lucide-react';

interface PollOption {
  id: string;
  text: {
    en: string;
    es: string;
  };
}

interface Poll {
  id: string;
  bookId: string;
  chapterId: string;
  requiresBookToken: boolean;
  pollType: 'conflict' | 'philosophical' | 'guardian-affinity' | 'worldbuilding';
  question: {
    en: string;
    es: string;
  };
  options: PollOption[];
}

interface PollResult {
  optionId: string;
  count: number;
  percentage: number;
}

interface ChapterPollProps {
  bookId: string;
  chapterId: string;
  language: 'en' | 'es';
  isTokenOwned: boolean;
  userAddress?: string;
  apiBaseUrl?: string;
}

const TRANSLATIONS = {
  en: {
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

export default function ChapterPoll({
  bookId,
  chapterId,
  language,
  isTokenOwned,
  userAddress,
  apiBaseUrl = 'https://www.lokapal.xyz/api'
}: ChapterPollProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(() => TRANSLATIONS[language], [language]);

  const fetchPoll = useCallback(async () =>{
    try {
      setLoading(true);
      setError(null);

      const url = userAddress
        ? `${apiBaseUrl}/books/${bookId}/chapters/${chapterId}/poll?wallet=${userAddress}`
        : `${apiBaseUrl}/books/${bookId}/chapters/${chapterId}/poll`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.poll) {
        setPoll(data.poll);
        setHasVoted(data.hasVoted);
        setUserVote(data.userVote);
        if (data.results) {
          setResults(data.results);
          setTotalVotes(data.totalVotes);
        }
      }
    } catch (err) {
      console.error('Failed to submit vote:', err);
      setError(t.poll_error);
    } finally {
      setLoading(false);
    }
  }, [bookId, chapterId, userAddress, apiBaseUrl, t.poll_error]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  const submitVote = async () => {
    if (!poll || !selectedOption || !userAddress) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optionId: selectedOption,
          walletAddress: userAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.poll_vote_error);
      }

      // Update state with results
      setHasVoted(true);
      setUserVote(data.userVote);
      setResults(data.results);
      setTotalVotes(data.totalVotes);
    } catch (err) {
      console.error('Failed to submit vote:', err);
      setError(err instanceof Error ? err.message : t.poll_vote_error);
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render anything if there's no poll
  if (!loading && !poll) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        marginTop: '48px',
        border: '1px solid rgba(34, 211, 238, 0.2)',
        background: 'rgba(2, 6, 23, 0.5)',
        borderRadius: '8px',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <BarChart3 style={{ 
          width: '32px', 
          height: '32px', 
          color: '#22d3ee', 
          margin: '0 auto 16px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }} />
        <p style={{ 
          color: '#22d3ee', 
          fontFamily: 'monospace', 
          fontSize: '14px' 
        }}>
          {t.poll_loading}
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        marginTop: '48px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        background: 'rgba(127, 29, 29, 0.2)',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#f87171', marginBottom: '16px', fontFamily: 'monospace' }}>
          {error}
        </p>
        <button
          onClick={fetchPoll}
          style={{
            padding: '8px 24px',
            background: '#dc2626',
            color: 'white',
            borderRadius: '4px',
            fontFamily: 'monospace',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {t.poll_retry}
        </button>
      </div>
    );
  }

  if (!poll) return null;

  const canVote = !poll.requiresBookToken || isTokenOwned;
  const showResults = hasVoted && results.length > 0;

  return (
    <div style={{
      marginTop: '48px',
      border: '1px solid rgba(34, 211, 238, 0.2)',
      background: 'rgba(2, 6, 23, 0.5)',
      borderRadius: '8px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '150px',
        height: '150px',
        background: 'rgba(34, 211, 238, 0.05)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <BarChart3 style={{ width: '20px', height: '20px', color: '#22d3ee' }} />
          <h3 style={{
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#22d3ee',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: 0,
          }}>
            {showResults ? t.poll_voted : t.poll_header}
          </h3>
        </div>

        {/* Question */}
        <p style={{
          fontSize: '18px',
          fontFamily: 'monospace',
          color: '#f1f5f9',
          marginBottom: '24px',
          lineHeight: 1.6,
        }}>
          {poll.question[language]}
        </p>

        {/* Show Results (after voting) */}
        {showResults ? (
          <>
            {/* User's choice */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              borderRadius: '6px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle style={{ width: '16px', height: '16px', color: '#4ade80' }} />
                <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#4ade80' }}>
                  {t.poll_your_choice}
                </span>
              </div>
              <p style={{
                fontSize: '15px',
                color: '#f1f5f9',
                margin: '8px 0 0 24px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                {poll.options.find(opt => opt.id === userVote)?.text[language]}
              </p>
            </div>

            {/* Results header */}
            <div style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px',
            }}>
              {t.poll_results}
            </div>

            {/* Results bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {results.map((result) => {
                const option = poll.options.find(opt => opt.id === result.optionId);
                const isUserChoice = result.optionId === userVote;
                
                return (
                  <div key={result.optionId}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        color: isUserChoice ? '#4ade80' : '#cbd5e1',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        {option?.text[language]}
                        {isUserChoice && (
                          <span style={{
                            fontSize: '10px',
                            color: '#4ade80',
                            padding: '2px 6px',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            borderRadius: '3px',
                            background: 'rgba(74, 222, 128, 0.05)',
                          }}>
                            YOU
                          </span>
                        )}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        color: '#64748b',
                        fontWeight: 'bold',
                      }}>
                        {result.percentage}%
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${result.percentage}%`,
                        height: '100%',
                        background: isUserChoice 
                          ? 'linear-gradient(90deg, rgba(74, 222, 128, 0.6), rgba(74, 222, 128, 0.3))'
                          : 'linear-gradient(90deg, rgba(34, 211, 238, 0.6), rgba(34, 211, 238, 0.3))',
                        transition: 'width 0.6s ease-out',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total votes */}
            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(30, 41, 59, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
            }}>
              <Users style={{ width: '16px', height: '16px', color: '#64748b' }} />
              <span style={{
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#64748b',
              }}>
                {t.poll_total} {totalVotes}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Options (before voting) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {poll.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => canVote && setSelectedOption(option.id)}
                  disabled={!canVote}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: selectedOption === option.id 
                      ? 'rgba(34, 211, 238, 0.1)' 
                      : 'rgba(2, 6, 23, 0.3)',
                    border: selectedOption === option.id 
                      ? '2px solid rgba(34, 211, 238, 0.5)' 
                      : '1px solid rgba(30, 41, 59, 0.5)',
                    borderRadius: '6px',
                    cursor: canVote ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    opacity: canVote ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: selectedOption === option.id 
                        ? '2px solid #22d3ee' 
                        : '2px solid #475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {selectedOption === option.id && (
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#22d3ee',
                        }} />
                      )}
                    </div>
                    <span style={{
                      fontSize: '15px',
                      color: '#f1f5f9',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: 1.5,
                    }}>
                      {option.text[language]}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Token requirement warning */}
            {poll.requiresBookToken && !isTokenOwned && (
              <div style={{
                padding: '12px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}>
                <Lock style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
                <span style={{ 
                  color: '#fbbf24', 
                  fontSize: '13px', 
                  fontFamily: 'monospace' 
                }}>
                  {t.poll_requires_token}
                </span>
              </div>
            )}

            {/* No wallet warning */}
            {!userAddress && (
              <div style={{
                padding: '12px',
                background: 'rgba(96, 165, 250, 0.1)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}>
                <Lock style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
                <span style={{ 
                  color: '#60a5fa', 
                  fontSize: '13px', 
                  fontFamily: 'monospace' 
                }}>
                  {t.poll_no_wallet}
                </span>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={submitVote}
              disabled={!canVote || !selectedOption || submitting || !userAddress}
              style={{
                width: '100%',
                padding: '16px',
                background: (canVote && selectedOption && userAddress && !submitting)
                  ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(96, 165, 250, 0.2))'
                  : 'rgba(30, 41, 59, 0.3)',
                border: (canVote && selectedOption && userAddress && !submitting)
                  ? '2px solid rgba(34, 211, 238, 0.4)'
                  : '1px solid rgba(30, 41, 59, 0.5)',
                color: (canVote && selectedOption && userAddress && !submitting) ? '#22d3ee' : '#64748b',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: (canVote && selectedOption && userAddress && !submitting) ? 'pointer' : 'not-allowed',
                opacity: (canVote && selectedOption && userAddress && !submitting) ? 1 : 0.5,
                transition: 'all 0.2s',
              }}
            >
              {submitting ? t.poll_submitting : t.poll_vote_btn}
            </button>
          </>
        )}
      </div>
    </div>
  );
}