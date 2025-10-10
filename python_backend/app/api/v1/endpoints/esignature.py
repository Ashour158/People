"""DocuSign E-Signature API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import Optional
from pydantic import BaseModel, EmailStr
import os
import shutil
from datetime import datetime

from app.integrations.docusign import docusign_service

router = APIRouter(prefix="/esignature", tags=["E-Signature"])


class SendForSignatureRequest(BaseModel):
    """Request model for sending document for signature"""
    signer_email: EmailStr
    signer_name: str
    document_name: str
    callback_url: Optional[str] = None


class EnvelopeStatusResponse(BaseModel):
    """Response model for envelope status"""
    success: bool
    envelope_id: Optional[str] = None
    status: Optional[str] = None
    sent_datetime: Optional[str] = None
    completed_datetime: Optional[str] = None
    error: Optional[str] = None


class VoidEnvelopeRequest(BaseModel):
    """Request model for voiding envelope"""
    reason: str = "Voided by sender"


@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_document_for_signature(
    request: SendForSignatureRequest,
    file: UploadFile = File(...)
):
    """
    Send a document for e-signature via DocuSign
    
    Args:
        request: Request containing signer details
        file: Document file to be signed (PDF recommended)
    
    Returns:
        Dict with envelope_id and status
    """
    if not docusign_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DocuSign service not configured. Check environment variables."
        )
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Create temporary directory for uploads
    temp_dir = "/tmp/docusign_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save uploaded file temporarily
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    temp_path = os.path.join(temp_dir, f"{timestamp}_{file.filename}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Send for signature
        result = docusign_service.send_document_for_signature(
            document_path=temp_path,
            signer_email=request.signer_email,
            signer_name=request.signer_name,
            document_name=request.document_name,
            callback_url=request.callback_url
        )
        
        # Clean up temporary file
        os.remove(temp_path)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to send document for signature")
            )
        
        return {
            "success": True,
            "envelope_id": result["envelope_id"],
            "status": result["status"],
            "message": f"Document sent to {request.signer_email} for signature"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up on error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )


@router.get("/status/{envelope_id}", response_model=EnvelopeStatusResponse)
async def get_envelope_status(envelope_id: str):
    """
    Get the status of a DocuSign envelope
    
    Args:
        envelope_id: The envelope ID returned from send endpoint
    
    Returns:
        Envelope status information
    """
    if not docusign_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DocuSign service not configured"
        )
    
    result = docusign_service.get_envelope_status(envelope_id)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result.get("error", "Envelope not found")
        )
    
    return result


@router.get("/download/{envelope_id}")
async def download_signed_document(envelope_id: str):
    """
    Download the signed document
    
    Args:
        envelope_id: The envelope ID
    
    Returns:
        Information about the downloaded document
    """
    if not docusign_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DocuSign service not configured"
        )
    
    # Create directory for signed documents
    signed_docs_dir = "/tmp/docusign_signed"
    os.makedirs(signed_docs_dir, exist_ok=True)
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    save_path = os.path.join(signed_docs_dir, f"signed_{envelope_id}_{timestamp}.pdf")
    
    result = docusign_service.download_signed_document(
        envelope_id=envelope_id,
        save_path=save_path
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result.get("error", "Document not found or not completed")
        )
    
    return {
        "success": True,
        "envelope_id": envelope_id,
        "file_path": save_path,
        "message": "Document downloaded successfully"
    }


@router.post("/void/{envelope_id}")
async def void_envelope(envelope_id: str, request: VoidEnvelopeRequest):
    """
    Void a DocuSign envelope
    
    Args:
        envelope_id: The envelope ID to void
        request: Void request with reason
    
    Returns:
        Confirmation of voiding
    """
    if not docusign_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DocuSign service not configured"
        )
    
    result = docusign_service.void_envelope(
        envelope_id=envelope_id,
        reason=request.reason
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to void envelope")
        )
    
    return {
        "success": True,
        "envelope_id": envelope_id,
        "status": "voided",
        "message": "Envelope voided successfully"
    }


@router.post("/webhook")
async def docusign_webhook(payload: dict):
    """
    Webhook endpoint for DocuSign event notifications
    
    This endpoint receives notifications when envelopes are completed,
    declined, or voided.
    
    Args:
        payload: DocuSign webhook payload
    
    Returns:
        Acknowledgment
    """
    # Log the webhook event
    event_type = payload.get("event")
    envelope_id = payload.get("envelopeId")
    
    print(f"DocuSign Webhook: {event_type} for envelope {envelope_id}")
    
    # TODO: Process the webhook event
    # - Update database status
    # - Send notifications
    # - Trigger workflows
    
    return {
        "success": True,
        "message": "Webhook received"
    }


@router.get("/health")
async def docusign_health_check():
    """
    Check DocuSign service health
    
    Returns:
        Service availability status
    """
    if not docusign_service:
        return {
            "available": False,
            "message": "DocuSign service not configured"
        }
    
    try:
        # Try to authenticate
        auth_success = docusign_service.authenticate()
        return {
            "available": auth_success,
            "message": "DocuSign service is available" if auth_success else "Authentication failed"
        }
    except Exception as e:
        return {
            "available": False,
            "message": f"Service check failed: {str(e)}"
        }
