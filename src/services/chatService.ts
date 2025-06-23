import { supabase } from '../lib/supabase';
import { Message } from '../types/chat';

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  product_id?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  created_at: string;
}

export interface CreateConversationData {
  title: string;
  product_id?: string;
}

export interface CreateMessageData {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
}

class ChatService {
  // Get all conversations for the current user
  async getConversations(): Promise<ChatConversation[]> {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }

    return data || [];
  }

  // Get a specific conversation
  async getConversation(id: string): Promise<ChatConversation | null> {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }

    return data;
  }

  // Create a new conversation
  async createConversation(conversationData: CreateConversationData): Promise<ChatConversation | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        title: conversationData.title,
        product_id: conversationData.product_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }

    return data;
  }

  // Update conversation title
  async updateConversationTitle(id: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ title })
      .eq('id', id);

    if (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }

  // Archive conversation (soft delete)
  async archiveConversation(id: string): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }

  // Permanently delete conversation
  async deleteConversation(id: string): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return data || [];
  }

  // Add a message to a conversation
  async addMessage(messageData: CreateMessageData): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: messageData.conversation_id,
        role: messageData.role,
        content: messageData.content,
        metadata: messageData.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      throw error;
    }

    return data;
  }

  // Delete a message
  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Clear all conversations for current user
  async clearAllConversations(): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ is_archived: true })
      .eq('is_archived', false);

    if (error) {
      console.error('Error clearing conversations:', error);
      throw error;
    }
  }

  // Generate conversation title from first message
  generateConversationTitle(firstMessage: string, productName?: string): string {
    const maxLength = 50;
    let title = firstMessage.length > maxLength 
      ? firstMessage.substring(0, maxLength) + '...' 
      : firstMessage;
    
    if (productName) {
      title = `${productName}: ${title}`;
    }
    
    return title;
  }

  // Convert ChatMessage to Message type used by UI
  convertToUIMessage(chatMessage: ChatMessage): Message {
    return {
      id: chatMessage.id,
      text: chatMessage.content,
      sender: chatMessage.role,
      timestamp: new Date(chatMessage.created_at)
    };
  }

  // Convert UI Message to ChatMessage data
  convertFromUIMessage(message: Message, conversationId: string): CreateMessageData {
    return {
      conversation_id: conversationId,
      role: message.sender,
      content: message.text,
      metadata: {}
    };
  }

  // Subscribe to conversation changes
  subscribeToConversations(callback: (conversations: ChatConversation[]) => void) {
    return supabase
      .channel('chat_conversations')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_conversations' 
        }, 
        () => {
          // Refetch conversations when changes occur
          this.getConversations().then(callback);
        }
      )
      .subscribe();
  }

  // Subscribe to message changes for a specific conversation
  subscribeToMessages(conversationId: string, callback: (messages: ChatMessage[]) => void) {
    return supabase
      .channel(`chat_messages_${conversationId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        () => {
          // Refetch messages when changes occur
          this.getMessages(conversationId).then(callback);
        }
      )
      .subscribe();
  }
}

export const chatService = new ChatService(); 