"""
AI Chatbot Service
Provides intelligent chatbot capabilities for HR queries
"""

import openai
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ChatMessage:
    role: str
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

class HRChatbot:
    """
    AI-powered HR chatbot
    """
    
    def __init__(self, openai_api_key: str):
        self.client = openai.OpenAI(api_key=openai_api_key)
        self.conversation_history: List[ChatMessage] = []
        self.system_prompt = self._get_system_prompt()
        
    def _get_system_prompt(self) -> str:
        """Get system prompt for HR chatbot"""
        return """
        You are an AI HR assistant for a comprehensive HR Management System. 
        You help employees and HR staff with various HR-related queries including:
        
        - Employee information and profiles
        - Attendance and leave policies
        - Payroll and benefits questions
        - Performance management
        - Company policies and procedures
        - HR processes and workflows
        
        Always be helpful, professional, and accurate. If you don't know something, 
        say so and offer to connect the user with a human HR representative.
        
        Keep responses concise but informative. Use a friendly, professional tone.
        """
    
    async def process_message(self, user_message: str, user_id: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process user message and generate response
        """
        try:
            # Add user message to conversation history
            user_msg = ChatMessage(
                role="user",
                content=user_message,
                timestamp=datetime.now(),
                metadata={"user_id": user_id, "context": context}
            )
            self.conversation_history.append(user_msg)
            
            # Analyze intent and extract entities
            intent = await self._analyze_intent(user_message)
            entities = await self._extract_entities(user_message)
            
            # Generate response based on intent
            if intent == "greeting":
                response = await self._handle_greeting(user_message)
            elif intent == "employee_info":
                response = await self._handle_employee_info(entities, user_id)
            elif intent == "attendance":
                response = await self._handle_attendance_query(entities, user_id)
            elif intent == "leave":
                response = await self._handle_leave_query(entities, user_id)
            elif intent == "payroll":
                response = await self._handle_payroll_query(entities, user_id)
            elif intent == "performance":
                response = await self._handle_performance_query(entities, user_id)
            elif intent == "policy":
                response = await self._handle_policy_query(entities, user_id)
            elif intent == "help":
                response = await self._handle_help_query()
            else:
                response = await self._handle_general_query(user_message)
            
            # Add assistant response to conversation history
            assistant_msg = ChatMessage(
                role="assistant",
                content=response["content"],
                timestamp=datetime.now(),
                metadata={"intent": intent, "entities": entities}
            )
            self.conversation_history.append(assistant_msg)
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return {
                "content": "I apologize, but I encountered an error processing your request. Please try again or contact HR support.",
                "intent": "error",
                "confidence": 0.0,
                "suggestions": ["Contact HR support", "Try rephrasing your question"]
            }
    
    async def _analyze_intent(self, message: str) -> str:
        """
        Analyze user intent using OpenAI
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Analyze the intent of the user message. Return one of: greeting, employee_info, attendance, leave, payroll, performance, policy, help, general"},
                    {"role": "user", "content": message}
                ],
                max_tokens=50,
                temperature=0.1
            )
            
            intent = response.choices[0].message.content.strip().lower()
            return intent
            
        except Exception as e:
            logger.error(f"Error analyzing intent: {str(e)}")
            return "general"
    
    async def _extract_entities(self, message: str) -> Dict[str, Any]:
        """
        Extract entities from user message
        """
        entities = {}
        
        # Extract dates
        date_patterns = [
            r'\b(\d{1,2}/\d{1,2}/\d{4})\b',
            r'\b(\d{4}-\d{2}-\d{2})\b',
            r'\b(today|yesterday|tomorrow)\b',
            r'\b(this week|last week|next week)\b',
            r'\b(this month|last month|next month)\b'
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            if matches:
                entities["dates"] = matches
        
        # Extract employee names
        name_pattern = r'\b([A-Z][a-z]+ [A-Z][a-z]+)\b'
        names = re.findall(name_pattern, message)
        if names:
            entities["names"] = names
        
        # Extract numbers
        number_pattern = r'\b(\d+)\b'
        numbers = re.findall(number_pattern, message)
        if numbers:
            entities["numbers"] = numbers
        
        return entities
    
    async def _handle_greeting(self, message: str) -> Dict[str, Any]:
        """Handle greeting messages"""
        greetings = [
            "Hello! I'm your HR assistant. How can I help you today?",
            "Hi there! I'm here to help with any HR-related questions you might have.",
            "Welcome! I can assist you with employee information, attendance, leave, payroll, and more."
        ]
        
        return {
            "content": greetings[0],
            "intent": "greeting",
            "confidence": 0.9,
            "suggestions": [
                "Check my attendance",
                "View my leave balance",
                "Get my payslip",
                "Company policies"
            ]
        }
    
    async def _handle_employee_info(self, entities: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Handle employee information queries"""
        # This would typically query the employee database
        return {
            "content": "I can help you with employee information. What specific information are you looking for?",
            "intent": "employee_info",
            "confidence": 0.8,
            "suggestions": [
                "My profile",
                "Employee directory",
                "Department information"
            ]
        }
    
    async def _handle_attendance_query(self, entities: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Handle attendance-related queries"""
        return {
            "content": "I can help you with attendance information. You can check your attendance records, request time off, or view your schedule.",
            "intent": "attendance",
            "confidence": 0.8,
            "suggestions": [
                "Check my attendance",
                "Request time off",
                "View my schedule",
                "Attendance policies"
            ]
        }
    
    async def _handle_leave_query(self, entities: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Handle leave-related queries"""
        return {
            "content": "I can help you with leave-related questions. You can check your leave balance, request time off, or view leave policies.",
            "intent": "leave",
            "confidence": 0.8,
            "suggestions": [
                "Check my leave balance",
                "Request time off",
                "Leave policies",
                "Leave history"
            ]
        }
    
    async def _handle_payroll_query(self, entities: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Handle payroll-related queries"""
        return {
            "content": "I can help you with payroll information. You can view your payslips, check your salary details, or get information about benefits.",
            "intent": "payroll",
            "confidence": 0.8,
            "suggestions": [
                "View my payslip",
                "Check my salary",
                "Benefits information",
                "Tax information"
            ]
        }
    
    async def _handle_performance_query(self, entities: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Handle performance-related queries"""
        return {
            "content": "I can help you with performance-related questions. You can view your performance reviews, set goals, or check your progress.",
            "intent": "performance",
            "confidence": 0.8,
            "suggestions": [
                "View my performance review",
                "Set goals",
                "Check my progress",
                "Performance policies"
            ]
        }
    
    async def _handle_policy_query(self, entities: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Handle policy-related queries"""
        return {
            "content": "I can help you with company policies. You can view HR policies, employee handbook, or get information about specific policies.",
            "intent": "policy",
            "confidence": 0.8,
            "suggestions": [
                "HR policies",
                "Employee handbook",
                "Code of conduct",
                "Workplace policies"
            ]
        }
    
    async def _handle_help_query(self) -> Dict[str, Any]:
        """Handle help queries"""
        return {
            "content": "I can help you with various HR-related tasks. Here are some things I can assist you with:\n\n• Employee information and profiles\n• Attendance and leave management\n• Payroll and benefits information\n• Performance management\n• Company policies and procedures\n\nWhat would you like to know?",
            "intent": "help",
            "confidence": 0.9,
            "suggestions": [
                "Employee information",
                "Attendance",
                "Leave management",
                "Payroll",
                "Performance"
            ]
        }
    
    async def _handle_general_query(self, message: str) -> Dict[str, Any]:
        """Handle general queries using OpenAI"""
        try:
            # Prepare conversation context
            messages = [{"role": "system", "content": self.system_prompt}]
            
            # Add recent conversation history
            for msg in self.conversation_history[-6:]:  # Last 6 messages
                messages.append({"role": msg.role, "content": msg.content})
            
            # Add current user message
            messages.append({"role": "user", "content": message})
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            content = response.choices[0].message.content.strip()
            
            return {
                "content": content,
                "intent": "general",
                "confidence": 0.7,
                "suggestions": [
                    "Ask about attendance",
                    "Check leave balance",
                    "View payslip",
                    "Get help"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error handling general query: {str(e)}")
            return {
                "content": "I apologize, but I'm having trouble processing your request. Please try rephrasing your question or contact HR support.",
                "intent": "error",
                "confidence": 0.0,
                "suggestions": ["Contact HR support", "Try a different question"]
            }
    
    def get_conversation_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "metadata": msg.metadata
            }
            for msg in self.conversation_history[-limit:]
        ]
    
    def clear_conversation_history(self):
        """Clear conversation history"""
        self.conversation_history.clear()
    
    def get_suggestions(self, context: str = None) -> List[str]:
        """Get contextual suggestions"""
        if context == "attendance":
            return [
                "Check my attendance",
                "Request time off",
                "View my schedule",
                "Attendance policies"
            ]
        elif context == "leave":
            return [
                "Check my leave balance",
                "Request time off",
                "Leave policies",
                "Leave history"
            ]
        elif context == "payroll":
            return [
                "View my payslip",
                "Check my salary",
                "Benefits information",
                "Tax information"
            ]
        else:
            return [
                "Check my attendance",
                "View my leave balance",
                "Get my payslip",
                "Company policies"
            ]

class ChatbotService:
    """
    Service for managing chatbot instances
    """
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.chatbots: Dict[str, HRChatbot] = {}
    
    def get_chatbot(self, user_id: str) -> HRChatbot:
        """Get or create chatbot instance for user"""
        if user_id not in self.chatbots:
            self.chatbots[user_id] = HRChatbot(self.openai_api_key)
        return self.chatbots[user_id]
    
    async def process_message(self, user_id: str, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process message for specific user"""
        chatbot = self.get_chatbot(user_id)
        return await chatbot.process_message(message, user_id, context)
    
    def get_conversation_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversation history for user"""
        chatbot = self.get_chatbot(user_id)
        return chatbot.get_conversation_history(limit)
    
    def clear_conversation_history(self, user_id: str):
        """Clear conversation history for user"""
        chatbot = self.get_chatbot(user_id)
        chatbot.clear_conversation_history()
    
    def get_suggestions(self, user_id: str, context: str = None) -> List[str]:
        """Get suggestions for user"""
        chatbot = self.get_chatbot(user_id)
        return chatbot.get_suggestions(context)
