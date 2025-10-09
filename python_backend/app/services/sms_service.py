"""
SMS Service
Enterprise SMS service with Twilio integration
Supports notifications, OTP, and bulk messaging
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
import structlog

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.core.config import settings

logger = structlog.get_logger()


class SMSService:
    """Enterprise SMS service with Twilio"""
    
    def __init__(self):
        """Initialize SMS service with Twilio credentials"""
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        self.from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
            self.enabled = True
        else:
            self.client = None
            self.enabled = False
            logger.warning("SMS service not configured - Twilio credentials missing")
    
    async def send_sms(
        self,
        to_number: str,
        message: str,
        from_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send SMS message
        
        Args:
            to_number: Recipient phone number (E.164 format)
            message: SMS message content
            from_number: Optional sender number (defaults to configured number)
            
        Returns:
            Dict with status and message_sid
        """
        if not self.enabled:
            logger.warning("SMS service disabled - skipping send")
            return {
                "success": False,
                "error": "SMS service not configured",
                "message_sid": None
            }
        
        try:
            # Validate phone number format
            if not to_number.startswith('+'):
                to_number = f"+{to_number}"
            
            # Send SMS
            message_obj = self.client.messages.create(
                body=message,
                from_=from_number or self.from_number,
                to=to_number
            )
            
            logger.info(
                "sms_sent",
                to=to_number,
                message_sid=message_obj.sid,
                status=message_obj.status
            )
            
            return {
                "success": True,
                "message_sid": message_obj.sid,
                "status": message_obj.status,
                "to": to_number
            }
            
        except TwilioRestException as e:
            logger.error(
                "sms_send_failed",
                to=to_number,
                error=str(e),
                error_code=e.code
            )
            return {
                "success": False,
                "error": str(e),
                "error_code": e.code,
                "message_sid": None
            }
        except Exception as e:
            logger.error("sms_send_error", to=to_number, error=str(e))
            return {
                "success": False,
                "error": str(e),
                "message_sid": None
            }
    
    async def send_otp(
        self,
        to_number: str,
        otp_code: str,
        expiry_minutes: int = 10
    ) -> Dict[str, Any]:
        """
        Send OTP SMS
        
        Args:
            to_number: Recipient phone number
            otp_code: OTP code
            expiry_minutes: OTP validity in minutes
            
        Returns:
            Send result
        """
        message = f"Your OTP code is: {otp_code}\nValid for {expiry_minutes} minutes.\nDo not share this code."
        
        result = await self.send_sms(to_number, message)
        
        if result["success"]:
            logger.info("otp_sent", to=to_number, message_sid=result["message_sid"])
        
        return result
    
    async def send_leave_notification(
        self,
        to_number: str,
        employee_name: str,
        leave_type: str,
        start_date: str,
        end_date: str,
        status: str
    ) -> Dict[str, Any]:
        """
        Send leave notification SMS
        
        Args:
            to_number: Recipient phone number
            employee_name: Employee name
            leave_type: Type of leave
            start_date: Leave start date
            end_date: Leave end date
            status: Leave status (approved/rejected/pending)
            
        Returns:
            Send result
        """
        if status.lower() == "approved":
            message = f"Hi {employee_name}, your {leave_type} from {start_date} to {end_date} has been APPROVED."
        elif status.lower() == "rejected":
            message = f"Hi {employee_name}, your {leave_type} from {start_date} to {end_date} has been REJECTED."
        else:
            message = f"Hi {employee_name}, your {leave_type} request from {start_date} to {end_date} is PENDING approval."
        
        return await self.send_sms(to_number, message)
    
    async def send_attendance_reminder(
        self,
        to_number: str,
        employee_name: str
    ) -> Dict[str, Any]:
        """
        Send attendance check-in reminder
        
        Args:
            to_number: Recipient phone number
            employee_name: Employee name
            
        Returns:
            Send result
        """
        message = f"Hi {employee_name}, friendly reminder to check in for today's attendance."
        return await self.send_sms(to_number, message)
    
    async def send_payslip_notification(
        self,
        to_number: str,
        employee_name: str,
        month: str,
        year: int
    ) -> Dict[str, Any]:
        """
        Send payslip available notification
        
        Args:
            to_number: Recipient phone number
            employee_name: Employee name
            month: Month name
            year: Year
            
        Returns:
            Send result
        """
        message = f"Hi {employee_name}, your payslip for {month} {year} is now available. Login to download."
        return await self.send_sms(to_number, message)
    
    async def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message_template: str
    ) -> List[Dict[str, Any]]:
        """
        Send bulk SMS messages
        
        Args:
            recipients: List of dicts with 'phone' and optional personalization data
            message_template: Message template with placeholders
            
        Returns:
            List of send results
        """
        results = []
        
        for recipient in recipients:
            try:
                # Personalize message
                message = message_template
                for key, value in recipient.items():
                    if key != 'phone':
                        message = message.replace(f"{{{key}}}", str(value))
                
                # Send SMS
                result = await self.send_sms(recipient['phone'], message)
                results.append({
                    "phone": recipient['phone'],
                    **result
                })
                
            except Exception as e:
                logger.error(
                    "bulk_sms_failed",
                    phone=recipient.get('phone'),
                    error=str(e)
                )
                results.append({
                    "phone": recipient.get('phone'),
                    "success": False,
                    "error": str(e)
                })
        
        logger.info(
            "bulk_sms_completed",
            total=len(recipients),
            successful=sum(1 for r in results if r.get("success"))
        )
        
        return results
    
    async def send_emergency_alert(
        self,
        to_number: str,
        alert_type: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send emergency alert SMS
        
        Args:
            to_number: Recipient phone number
            alert_type: Type of emergency
            message: Alert message
            
        Returns:
            Send result
        """
        full_message = f"[EMERGENCY ALERT - {alert_type}]\n{message}"
        return await self.send_sms(to_number, full_message)
    
    async def send_interview_reminder(
        self,
        to_number: str,
        candidate_name: str,
        interview_date: str,
        interview_time: str,
        position: str
    ) -> Dict[str, Any]:
        """
        Send interview reminder SMS
        
        Args:
            to_number: Candidate phone number
            candidate_name: Candidate name
            interview_date: Interview date
            interview_time: Interview time
            position: Position name
            
        Returns:
            Send result
        """
        message = (
            f"Hi {candidate_name}, reminder: Interview for {position} "
            f"on {interview_date} at {interview_time}. Good luck!"
        )
        return await self.send_sms(to_number, message)
    
    async def send_birthday_wish(
        self,
        to_number: str,
        employee_name: str,
        organization_name: str
    ) -> Dict[str, Any]:
        """
        Send birthday wish SMS
        
        Args:
            to_number: Employee phone number
            employee_name: Employee name
            organization_name: Organization name
            
        Returns:
            Send result
        """
        message = (
            f"🎉 Happy Birthday {employee_name}! 🎂\n"
            f"Wishing you a wonderful day from all of us at {organization_name}!"
        )
        return await self.send_sms(to_number, message)
    
    async def send_password_reset(
        self,
        to_number: str,
        reset_code: str
    ) -> Dict[str, Any]:
        """
        Send password reset code
        
        Args:
            to_number: User phone number
            reset_code: Reset code
            
        Returns:
            Send result
        """
        message = (
            f"Your password reset code is: {reset_code}\n"
            f"Valid for 15 minutes. Do not share this code."
        )
        return await self.send_sms(to_number, message)
    
    async def get_message_status(self, message_sid: str) -> Optional[Dict[str, Any]]:
        """
        Get status of sent message
        
        Args:
            message_sid: Twilio message SID
            
        Returns:
            Message status info or None
        """
        if not self.enabled:
            return None
        
        try:
            message = self.client.messages(message_sid).fetch()
            
            return {
                "message_sid": message.sid,
                "status": message.status,
                "to": message.to,
                "from": message.from_,
                "date_sent": message.date_sent,
                "error_code": message.error_code,
                "error_message": message.error_message
            }
            
        except Exception as e:
            logger.error("get_message_status_failed", message_sid=message_sid, error=str(e))
            return None
    
    def validate_phone_number(self, phone_number: str) -> bool:
        """
        Validate phone number format
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            True if valid, False otherwise
        """
        if not phone_number:
            return False
        
        # Basic validation - should start with + and contain only digits
        clean_number = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        return clean_number.isdigit() and len(clean_number) >= 10
    
    async def send_shift_reminder(
        self,
        to_number: str,
        employee_name: str,
        shift_start_time: str,
        shift_date: str
    ) -> Dict[str, Any]:
        """
        Send shift reminder SMS
        
        Args:
            to_number: Employee phone number
            employee_name: Employee name
            shift_start_time: Shift start time
            shift_date: Shift date
            
        Returns:
            Send result
        """
        message = (
            f"Hi {employee_name}, reminder: Your shift starts at {shift_start_time} "
            f"on {shift_date}."
        )
        return await self.send_sms(to_number, message)
    
    async def send_document_expiry_alert(
        self,
        to_number: str,
        employee_name: str,
        document_name: str,
        expiry_date: str
    ) -> Dict[str, Any]:
        """
        Send document expiry alert
        
        Args:
            to_number: Employee phone number
            employee_name: Employee name
            document_name: Document name
            expiry_date: Expiry date
            
        Returns:
            Send result
        """
        message = (
            f"Hi {employee_name}, your {document_name} expires on {expiry_date}. "
            f"Please renew it soon."
        )
        return await self.send_sms(to_number, message)


# Singleton instance
sms_service = SMSService()
