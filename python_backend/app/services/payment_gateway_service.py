"""
Payment Gateway Service
Handles payment processing for payroll via Stripe, PayPal, and bank transfers
"""
import httpx
import hashlib
import hmac
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.integrations import Integration, PaymentGateway, IntegrationLog
from app.schemas.integrations import PaymentGatewayCreate, PaymentGatewayUpdate
from app.core.exceptions import NotFoundException, IntegrationError


class PaymentGatewayService:
    """Service for payment gateway operations"""
    
    STRIPE_API_BASE = "https://api.stripe.com/v1"
    PAYPAL_API_BASE = "https://api.paypal.com/v1"
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==================== Gateway Configuration ====================
    
    async def create_gateway(self, gateway_data: PaymentGatewayCreate) -> PaymentGateway:
        """Create new payment gateway configuration"""
        # If setting as default, unset other defaults
        if gateway_data.is_default:
            await self._unset_default_gateways(gateway_data.organization_id)
        
        gateway = PaymentGateway(**gateway_data.dict())
        self.db.add(gateway)
        await self.db.commit()
        await self.db.refresh(gateway)
        return gateway
    
    async def get_gateway(self, gateway_id: UUID) -> Optional[PaymentGateway]:
        """Get payment gateway by ID"""
        query = select(PaymentGateway).where(PaymentGateway.gateway_id == gateway_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_default_gateway(self, organization_id: UUID) -> Optional[PaymentGateway]:
        """Get default payment gateway for organization"""
        query = select(PaymentGateway).where(
            and_(
                PaymentGateway.organization_id == organization_id,
                PaymentGateway.is_default == True,
                PaymentGateway.is_active == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_gateways_by_organization(
        self,
        organization_id: UUID,
        is_active: Optional[bool] = None
    ) -> List[PaymentGateway]:
        """Get all payment gateways for an organization"""
        query = select(PaymentGateway).where(
            PaymentGateway.organization_id == organization_id
        )
        
        if is_active is not None:
            query = query.where(PaymentGateway.is_active == is_active)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_gateway(
        self,
        gateway_id: UUID,
        gateway_data: PaymentGatewayUpdate
    ) -> PaymentGateway:
        """Update payment gateway configuration"""
        gateway = await self.get_gateway(gateway_id)
        
        if not gateway:
            raise NotFoundException(f"Payment gateway {gateway_id} not found")
        
        # If setting as default, unset other defaults
        if gateway_data.is_default and gateway_data.is_default != gateway.is_default:
            await self._unset_default_gateways(gateway.organization_id)
        
        for key, value in gateway_data.dict(exclude_unset=True).items():
            setattr(gateway, key, value)
        
        await self.db.commit()
        await self.db.refresh(gateway)
        return gateway
    
    # ==================== Stripe Integration ====================
    
    async def process_stripe_payment(
        self,
        gateway_id: UUID,
        employee_id: UUID,
        amount: Decimal,
        currency: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process payment via Stripe"""
        gateway = await self.get_gateway(gateway_id)
        
        if not gateway or gateway.gateway_name.lower() != "stripe":
            raise IntegrationError("Invalid Stripe gateway configuration")
        
        # Get employee bank account or payment method
        # In production, this would come from a secure employee_payment_methods table
        
        payload = {
            "amount": int(amount * 100),  # Stripe uses cents
            "currency": currency.lower(),
            "description": description,
            "metadata": metadata or {}
        }
        
        start_time = datetime.utcnow()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.STRIPE_API_BASE}/charges",
                    auth=(gateway.secret_key, ""),
                    data=payload,
                    timeout=30.0
                )
                
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                if response.status_code not in [200, 201]:
                    error_data = response.json()
                    await self._log_api_call(
                        integration_id=gateway.integration_id,
                        organization_id=gateway.organization_id,
                        event_type="stripe_payment",
                        request_data=payload,
                        response_data=error_data,
                        status_code=response.status_code,
                        is_success=False,
                        error_message="Stripe payment failed",
                        duration_ms=duration_ms
                    )
                    raise IntegrationError(f"Stripe payment failed: {error_data.get('error', {}).get('message')}")
                
                stripe_response = response.json()
                
                # Log successful payment
                await self._log_api_call(
                    integration_id=gateway.integration_id,
                    organization_id=gateway.organization_id,
                    event_type="stripe_payment",
                    request_data=payload,
                    response_data=stripe_response,
                    status_code=response.status_code,
                    is_success=True,
                    duration_ms=duration_ms
                )
                
                return {
                    "success": True,
                    "transaction_id": stripe_response.get("id"),
                    "amount": amount,
                    "currency": currency,
                    "status": stripe_response.get("status"),
                    "created_at": datetime.utcnow()
                }
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Stripe payment error: {str(e)}")
    
    async def create_stripe_transfer(
        self,
        gateway_id: UUID,
        employee_bank_account: str,
        amount: Decimal,
        currency: str,
        description: str
    ) -> Dict[str, Any]:
        """Create a bank transfer via Stripe"""
        gateway = await self.get_gateway(gateway_id)
        
        if not gateway:
            raise NotFoundException("Payment gateway not found")
        
        payload = {
            "amount": int(amount * 100),
            "currency": currency.lower(),
            "destination": employee_bank_account,
            "description": description
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.STRIPE_API_BASE}/transfers",
                    auth=(gateway.secret_key, ""),
                    data=payload,
                    timeout=30.0
                )
                
                if response.status_code not in [200, 201]:
                    raise IntegrationError("Failed to create Stripe transfer")
                
                return response.json()
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Stripe transfer error: {str(e)}")
    
    # ==================== PayPal Integration ====================
    
    async def process_paypal_payment(
        self,
        gateway_id: UUID,
        employee_email: str,
        amount: Decimal,
        currency: str,
        description: str
    ) -> Dict[str, Any]:
        """Process payment via PayPal"""
        gateway = await self.get_gateway(gateway_id)
        
        if not gateway or gateway.gateway_name.lower() != "paypal":
            raise IntegrationError("Invalid PayPal gateway configuration")
        
        # Get PayPal access token
        access_token = await self._get_paypal_access_token(gateway)
        
        # Create payout
        payload = {
            "sender_batch_header": {
                "sender_batch_id": f"salary_{datetime.utcnow().timestamp()}",
                "email_subject": "You received a salary payment",
                "email_message": description
            },
            "items": [
                {
                    "recipient_type": "EMAIL",
                    "amount": {
                        "value": str(amount),
                        "currency": currency
                    },
                    "receiver": employee_email,
                    "note": description,
                    "sender_item_id": f"item_{datetime.utcnow().timestamp()}"
                }
            ]
        }
        
        start_time = datetime.utcnow()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.PAYPAL_API_BASE}/payments/payouts",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=30.0
                )
                
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                if response.status_code not in [200, 201]:
                    error_data = response.json()
                    await self._log_api_call(
                        integration_id=gateway.integration_id,
                        organization_id=gateway.organization_id,
                        event_type="paypal_payment",
                        request_data=payload,
                        response_data=error_data,
                        status_code=response.status_code,
                        is_success=False,
                        error_message="PayPal payment failed",
                        duration_ms=duration_ms
                    )
                    raise IntegrationError("PayPal payment failed")
                
                paypal_response = response.json()
                
                # Log successful payment
                await self._log_api_call(
                    integration_id=gateway.integration_id,
                    organization_id=gateway.organization_id,
                    event_type="paypal_payment",
                    request_data=payload,
                    response_data=paypal_response,
                    status_code=response.status_code,
                    is_success=True,
                    duration_ms=duration_ms
                )
                
                return {
                    "success": True,
                    "batch_id": paypal_response.get("batch_header", {}).get("payout_batch_id"),
                    "amount": amount,
                    "currency": currency,
                    "status": "PENDING",
                    "created_at": datetime.utcnow()
                }
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"PayPal payment error: {str(e)}")
    
    async def get_paypal_payout_status(
        self,
        gateway_id: UUID,
        batch_id: str
    ) -> Dict[str, Any]:
        """Get PayPal payout status"""
        gateway = await self.get_gateway(gateway_id)
        
        if not gateway:
            raise NotFoundException("Payment gateway not found")
        
        access_token = await self._get_paypal_access_token(gateway)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.PAYPAL_API_BASE}/payments/payouts/{batch_id}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise IntegrationError("Failed to get payout status")
                
                return response.json()
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"PayPal status check error: {str(e)}")
    
    # ==================== Bank Transfer ====================
    
    async def process_bank_transfer(
        self,
        gateway_id: UUID,
        employee_id: UUID,
        amount: Decimal,
        currency: str,
        bank_account_number: str,
        bank_routing_number: str,
        description: str
    ) -> Dict[str, Any]:
        """Process direct bank transfer"""
        gateway = await self.get_gateway(gateway_id)
        
        if not gateway or gateway.gateway_name.lower() != "bank_transfer":
            raise IntegrationError("Invalid bank transfer configuration")
        
        # In production, this would integrate with actual bank APIs
        # For now, simulate the transfer
        
        transfer_data = {
            "gateway_id": str(gateway_id),
            "employee_id": str(employee_id),
            "amount": float(amount),
            "currency": currency,
            "bank_account": bank_account_number[-4:],  # Last 4 digits only
            "bank_routing": bank_routing_number,
            "description": description,
            "status": "pending",
            "created_at": datetime.utcnow()
        }
        
        # Log the transfer
        await self._log_api_call(
            integration_id=gateway.integration_id,
            organization_id=gateway.organization_id,
            event_type="bank_transfer",
            request_data=transfer_data,
            response_data={"status": "pending"},
            status_code=200,
            is_success=True,
            duration_ms=0
        )
        
        return {
            "success": True,
            "transfer_id": f"BT{datetime.utcnow().timestamp()}",
            "amount": amount,
            "currency": currency,
            "status": "pending",
            "estimated_completion": "2-3 business days",
            "created_at": datetime.utcnow()
        }
    
    # ==================== Batch Payments ====================
    
    async def process_batch_payroll(
        self,
        organization_id: UUID,
        payments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process batch payroll payments"""
        gateway = await self.get_default_gateway(organization_id)
        
        if not gateway:
            raise IntegrationError("No default payment gateway configured")
        
        results = {
            "total": len(payments),
            "successful": 0,
            "failed": 0,
            "details": []
        }
        
        for payment in payments:
            try:
                if gateway.gateway_name.lower() == "stripe":
                    result = await self.process_stripe_payment(
                        gateway.gateway_id,
                        payment["employee_id"],
                        Decimal(str(payment["amount"])),
                        payment.get("currency", "USD"),
                        payment.get("description", "Salary payment"),
                        payment.get("metadata")
                    )
                elif gateway.gateway_name.lower() == "paypal":
                    result = await self.process_paypal_payment(
                        gateway.gateway_id,
                        payment["employee_email"],
                        Decimal(str(payment["amount"])),
                        payment.get("currency", "USD"),
                        payment.get("description", "Salary payment")
                    )
                else:
                    result = await self.process_bank_transfer(
                        gateway.gateway_id,
                        payment["employee_id"],
                        Decimal(str(payment["amount"])),
                        payment.get("currency", "USD"),
                        payment["bank_account"],
                        payment["bank_routing"],
                        payment.get("description", "Salary payment")
                    )
                
                results["successful"] += 1
                results["details"].append({
                    "employee_id": payment["employee_id"],
                    "status": "success",
                    "result": result
                })
            
            except Exception as e:
                results["failed"] += 1
                results["details"].append({
                    "employee_id": payment["employee_id"],
                    "status": "failed",
                    "error": str(e)
                })
        
        return results
    
    # ==================== Helper Methods ====================
    
    async def _get_paypal_access_token(self, gateway: PaymentGateway) -> str:
        """Get PayPal OAuth access token"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.PAYPAL_API_BASE}/oauth2/token",
                    auth=(gateway.client_id, gateway.secret_key),
                    data={"grant_type": "client_credentials"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise IntegrationError("Failed to get PayPal access token")
                
                data = response.json()
                return data.get("access_token")
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"PayPal auth error: {str(e)}")
    
    async def _unset_default_gateways(self, organization_id: UUID):
        """Unset all default gateways for organization"""
        query = select(PaymentGateway).where(
            and_(
                PaymentGateway.organization_id == organization_id,
                PaymentGateway.is_default == True
            )
        )
        result = await self.db.execute(query)
        gateways = result.scalars().all()
        
        for gateway in gateways:
            gateway.is_default = False
        
        await self.db.commit()
    
    async def _log_api_call(
        self,
        integration_id: UUID,
        organization_id: UUID,
        event_type: str,
        request_data: Optional[Dict] = None,
        response_data: Optional[Dict] = None,
        status_code: int = 0,
        is_success: bool = True,
        error_message: Optional[str] = None,
        duration_ms: int = 0
    ):
        """Log integration API call"""
        log = IntegrationLog(
            integration_id=integration_id,
            organization_id=organization_id,
            event_type=event_type,
            request_data=request_data,
            response_data=response_data,
            status_code=status_code,
            is_success=is_success,
            error_message=error_message,
            duration_ms=duration_ms
        )
        
        self.db.add(log)
        await self.db.commit()
