import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import aiApi from '../../api/ai.api';

interface Message {
  messageType: 'user' | 'bot';
  content: string;
  timestamp: string;
}

export const AIChatbot: React.FC = () => {
  const [conversationId] = useState(() => {
    // Generate or retrieve conversation ID
    const stored = localStorage.getItem('chatConversationId');
    if (stored) return stored;
    const newId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatConversationId', newId);
    return newId;
  });

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      messageType: 'bot',
      content: 'Hi! I\'m your HR assistant. How can I help you today?',
      timestamp: new Date().toISOString(),
    },
  ]);

  // Load chat history
  const { isLoading: historyLoading } = useQuery({
    queryKey: ['chat-history', conversationId],
    queryFn: () => aiApi.getChatHistory(conversationId),
    onSuccess: (data) => {
      if (data?.data?.messages?.length > 0) {
        setMessages(data.data.messages);
      }
    },
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (msg: string) =>
      aiApi.sendChatMessage({
        conversationId,
        message: msg,
        context: {
          currentPage: window.location.pathname,
          timestamp: new Date().toISOString(),
        },
      }),
    onSuccess: (data) => {
      // Add bot response
      setMessages((prev) => [
        ...prev,
        {
          messageType: 'bot',
          content: data.data.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMutation.isLoading) return;

    // Add user message
    const userMessage: Message = {
      messageType: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to API
    sendMutation.mutate(message);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    localStorage.removeItem('chatConversationId');
    window.location.reload();
  };

  const suggestedQuestions = [
    'How do I apply for leave?',
    'What are my benefits?',
    'How do I update my profile?',
    'What is the company holiday policy?',
  ];

  const handleSuggestionClick = (question: string) => {
    setMessage(question);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            HR Virtual Assistant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ask me anything about HR policies, procedures, and benefits
          </Typography>
        </Box>
        <IconButton onClick={handleReset} title="Start new conversation">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Chat Messages Area */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.messageType === 'user' ? 'flex-end' : 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      maxWidth: '70%',
                      flexDirection: msg.messageType === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: msg.messageType === 'user' ? 'primary.main' : 'secondary.main',
                      }}
                    >
                      {msg.messageType === 'user' ? <PersonIcon /> : <BotIcon />}
                    </Avatar>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: msg.messageType === 'user' ? 'primary.light' : 'grey.100',
                        color: msg.messageType === 'user' ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 1,
                          opacity: 0.7,
                        }}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              ))}

              {sendMutation.isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <BotIcon />
                    </Avatar>
                    <Paper sx={{ p: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>
                        Thinking...
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              )}
            </>
          )}
        </CardContent>

        <Divider />

        {/* Suggested Questions (shown when no messages) */}
        {messages.length === 1 && (
          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Try asking:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  size="small"
                  variant="outlined"
                  onClick={() => handleSuggestionClick(question)}
                >
                  {question}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {/* Input Area */}
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMutation.isLoading}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isLoading}
              sx={{ minWidth: 'auto', px: 3 }}
            >
              <SendIcon />
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Press Enter to send, Shift+Enter for new line
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default AIChatbot;
