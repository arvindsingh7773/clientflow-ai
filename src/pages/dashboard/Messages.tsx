import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ChatRoom, Message } from '../../types';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Send, Loader2, Search, MoreVertical } from 'lucide-react';

export function Messages() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to user's chat rooms
    const q = query(
      collection(db, 'chatRooms'),
      where('participantIds', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms: ChatRoom[] = [];
      snapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() } as ChatRoom);
      });
      // Sort by lastMessageTime descending
      rooms.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
      setChatRooms(rooms);
      setLoadingRooms(false);
      
      // Auto-select first room if none selected
      if (!activeRoomId && rooms.length > 0) {
        setActiveRoomId(rooms[0].id);
      }
    });

    return () => unsubscribe();
  }, [user, activeRoomId]);

  useEffect(() => {
    if (!activeRoomId) return;

    // Subscribe to messages in active room
    const q = query(
      collection(db, 'messages'),
      where('roomId', '==', activeRoomId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      
      // Mark as read (simplified)
      if (user && activeRoomId) {
        const roomRef = doc(db, 'chatRooms', activeRoomId);
        updateDoc(roomRef, {
          [`unreadCount.${user.id}`]: 0
        }).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, [activeRoomId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoomId || !user) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      // Add message
      await addDoc(collection(db, 'messages'), {
        roomId: activeRoomId,
        senderId: user.id,
        text,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Update room lastMessage
      const room = chatRooms.find(r => r.id === activeRoomId);
      if (room) {
        const otherParticipantId = room.participantIds.find(id => id !== user.id);
        const updates: any = {
          lastMessage: text,
          lastMessageTime: new Date().toISOString(),
        };
        if (otherParticipantId) {
          updates[`unreadCount.${otherParticipantId}`] = (room.unreadCount?.[otherParticipantId] || 0) + 1;
        }
        await updateDoc(doc(db, 'chatRooms', activeRoomId), updates);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getOtherParticipantName = (room: ChatRoom) => {
    if (!user) return 'Unknown';
    const otherId = room.participantIds.find(id => id !== user.id);
    return otherId ? room.participantNames[otherId] : 'Unknown';
  };

  const filteredRooms = chatRooms.filter(room => 
    getOtherParticipantName(room).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-5rem)] flex p-6 gap-6">
      {/* Sidebar - Chat List */}
      <Card className="w-1/3 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold font-heading mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-9 bg-accent/50 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No conversations found.</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${activeRoomId === room.id ? 'bg-accent/80' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-sm truncate">{getOtherParticipantName(room)}</h3>
                    {room.lastMessageTime && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(room.lastMessageTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground truncate pr-4">{room.lastMessage || 'No messages yet'}</p>
                    {room.unreadCount?.[user?.id || ''] > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
                        {room.unreadCount[user?.id || '']}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {activeRoomId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-accent/10">
              <h3 className="font-semibold">{getOtherParticipantName(chatRooms.find(r => r.id === activeRoomId)!)}</h3>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-accent/50 text-foreground rounded-bl-sm'}`}>
                      <p className="text-sm break-words">{msg.text}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-accent/30 border-none focus-visible:ring-1"
                />
                <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col">
            <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 opacity-50" />
            </div>
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </Card>
    </div>
  );
}
