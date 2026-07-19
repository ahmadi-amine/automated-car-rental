'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Minus, Maximize2, Trash2, Mic, Square, Volume2 } from 'lucide-react';
import { getApiUrl } from '@/utils/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  bookingData?: any;
  fleetData?: any[];
  isConfirmed?: boolean;
}

interface ChatbotWidgetProps {
  agencySlug: string;
  primaryColor: string;
  agencyName: string;
}

export default function ChatbotWidget({ agencySlug, primaryColor, agencyName }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const storageKey = `chat_history_${agencySlug}`;

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem(storageKey);
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    console.log("ChatbotWidget initialized for agency:", agencySlug);
  }, [agencySlug]);

  useEffect(() => {
    // Save history to localStorage whenever messages change
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { role: 'assistant', content: `Hello! I'm the AI assistant for ${agencyName}. How can I help you today?` }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, voiceText?: string) => {
    e?.preventDefault();
    const userMessage = voiceText || input.trim();
    if (!userMessage || isLoading) return;

    const newMessage: Message = { role: 'user', content: userMessage };
    const updatedHistory = [...messages, newMessage];
    
    setInput('');
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/ai/chat/${agencySlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: updatedHistory.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.answer,
          bookingData: data.bookingData,
          fleetData: data.fleetData
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, an error occurred. Please check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleVoiceUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceUpload = async (blob: Blob) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    try {
      const res = await fetch(`${getApiUrl()}/api/ai/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          handleSend(undefined, data.text);
        }
      } else {
        console.error("Transcription failed");
      }
    } catch (err) {
      console.error("Error uploading voice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const playTextAsSpeech = async (text: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/ai/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (err) {
      console.error("TTS failed:", err);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this conversation?")) {
      setMessages([
        { role: 'assistant', content: `Hello! I'm the AI assistant for ${agencyName}. How can I help you today?` }
      ]);
      localStorage.removeItem(storageKey);
    }
  };

  const handleConfirmBooking = async (msgIndex: number, bookingData: any) => {
    setIsLoading(true);
    try {
      // Structure the payload exactly like our standard booking form
      const normalizeDateOnly = (d: string) => d ? d.split('T')[0] : d;

      const payload = {
        vehicleId: bookingData.vehicleId,
        startDate: normalizeDateOnly(bookingData.startDate),
        endDate: normalizeDateOnly(bookingData.endDate),
        phone: bookingData.phone,
        firstName: bookingData.firstName,
        lastName: bookingData.lastName,
        email: bookingData.email
      };

      const res = await fetch(`${getApiUrl()}/api/bookings/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Update the message state to show it's confirmed
        const updatedMessages = [...messages];
        // Find the index of the specific message we're confirming
        const targetIndex = updatedMessages.findIndex((m, idx) => idx === msgIndex);
        if (targetIndex !== -1) {
          updatedMessages[targetIndex] = {
            ...updatedMessages[targetIndex],
            isConfirmed: true
          };
        }

        updatedMessages.push({
          role: 'assistant',
          content: "Perfect! Your booking has been placed and sent to the agency for approval. You will be contacted soon! ✅"
        });
        setMessages(updatedMessages);
      } else {
        const err = await res.json();
        alert(err.message || 'Booking failed');
      }
    } catch (err) {
      console.error('Booking confirmation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCar = (car: any) => {
    const message = `I'd like to rent the ${car.make} ${car.model}`;
    // Directly trigger send flow
    handleAutoSend(message);
  };

  const handleAutoSend = async (userMessage: string) => {
    if (isLoading) return;
    
    const newMessage: Message = { role: 'user', content: userMessage };
    const updatedHistory = [...messages, newMessage];
    
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/ai/chat/${agencySlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: updatedHistory.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.answer,
          bookingData: data.bookingData,
          fleetData: data.fleetData
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, an error occurred. Please check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: primaryColor,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          border: 'none',
          cursor: 'pointer',
          transition: '0.3s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquare size={30} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      width: '380px',
      height: isMinimized ? '60px' : '550px',
      background: '#16181d',
      borderRadius: '24px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
      zIndex: 9999,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: `linear-gradient(135deg, ${primaryColor} 0%, #16181d 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer'
      }} onClick={() => isMinimized && setIsMinimized(false)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={24} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: 'white' }}>{agencyName} AI</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
              Online
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {messages.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleClearChat(); }} 
              style={{ color: 'white', opacity: 0.7, padding: '4px', transition: '0.3s' }}
              title="Clear conversation"
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} style={{ color: 'white', opacity: 0.7, padding: '4px' }}>
            {isMinimized ? <Maximize2 size={18} /> : <Minus size={18} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} style={{ color: 'white', opacity: 0.7, padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'rgba(255,255,255,0.02)'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: '10px',
                  width: '100%'
                }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bot size={18} color={primaryColor} />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user' ? primaryColor : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                  }}>
                    {msg.content}
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => playTextAsSpeech(msg.content)}
                        style={{ display: 'block', marginTop: '8px', opacity: 0.6, cursor: 'pointer' }}
                        title="Read aloud"
                      >
                        <Volume2 size={14} />
                      </button>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={18} color="white" />
                    </div>
                  )}
                </div>

                {/* Booking Summary Card */}
                {msg.bookingData && (
                  <div className="glass" style={{
                    marginLeft: msg.role === 'assistant' ? '42px' : '0',
                    marginRight: msg.role === 'user' ? '42px' : '0',
                    width: 'calc(100% - 42px)',
                    padding: '16px',
                    borderRadius: '16px',
                    border: msg.isConfirmed ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    background: msg.isConfirmed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.03)'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Booking Summary</span>
                      {msg.isConfirmed && <span style={{ color: '#10b981' }}>Confirmed</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '60px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                        {msg.bookingData.vehicleDetails?.imageUrl && <img src={msg.bookingData.vehicleDetails.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800' }}>{msg.bookingData.vehicleDetails?.make} {msg.bookingData.vehicleDetails?.model}</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{msg.bookingData.startDate} to {msg.bookingData.endDate}</div>
                      </div>
                    </div>
                    
                    {!msg.isConfirmed && (
                      <button 
                        onClick={() => handleConfirmBooking(i, msg.bookingData)}
                        disabled={isLoading}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: primaryColor,
                          color: 'white',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        {isLoading ? <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Confirm Booking'}
                      </button>
                    )}
                  </div>
                )}

                {/* Fleet List Cards */}
                {msg.fleetData && (
                  <div style={{
                    marginLeft: '42px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: 'calc(100% - 42px)'
                  }}>
                    {msg.fleetData.map((car: any) => (
                      <div 
                        key={car.id} 
                        className="glass"
                        onClick={() => handleSelectCar(car)}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '12px',
                          transition: '0.3s',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.borderColor = primaryColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                        }}
                      >
                        <div style={{ width: '80px', height: '50px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                          {car.imageUrl ? (
                            <img src={car.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                              <Bot size={20} />
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{car.make} {car.model}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', color: primaryColor, fontWeight: '700' }}>{car.pricePerDay} MAD/day</span>
                            <span style={{ fontSize: '11px', opacity: 0.6 }}>{car.category}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} color={primaryColor} />
                </div>
                <div className="glass" style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px' }}>
                  <Loader2 size={18} className="animate-spin" style={{ opacity: 0.5 }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{
            padding: '20px',
            background: '#16181d',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '12px',
                background: isRecording ? '#ef4444' : 'rgba(255,255,255,0.05)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: '0.3s'
              }}
              title={isRecording ? "Stop Recording" : "Voice Message"}
            >
              {isRecording ? <Square size={20} fill="white" /> : <Mic size={20} />}
            </button>
            <input
              type="text"
              className="input"
              placeholder={isRecording ? "Listening..." : "Ask anything..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isRecording}
              style={{ padding: '10px 16px', fontSize: '14px', flex: 1 }}
            />
            <button
              disabled={!input.trim() || isLoading || isRecording}
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '12px',
                background: input.trim() ? primaryColor : 'rgba(255,255,255,0.05)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: '0.3s',
                cursor: input.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              <Send size={20} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
