"""
Pydantic schemas for Document Management and E-signature
Request/response validation for documents and signatures
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


# Document Category
class DocumentCategoryCreate(BaseModel):
    """Create document category"""
    category_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    parent_category_id: Optional[UUID] = None
    icon: Optional[str] = None


class DocumentCategoryResponse(BaseModel):
    """Document category response"""
    category_id: UUID
    organization_id: UUID
    category_name: str
    description: Optional[str]
    icon: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


# Document
class DocumentCreate(BaseModel):
    """Create document"""
    document_name: str = Field(..., min_length=1, max_length=500)
    document_type: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    file_url: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    has_expiry: bool = False
    expiry_date: Optional[date] = None
    is_public: bool = False
    requires_signature: bool = False
    tags: Optional[List[str]] = None


class DocumentUpdate(BaseModel):
    """Update document"""
    document_name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    has_expiry: Optional[bool] = None
    expiry_date: Optional[date] = None
    tags: Optional[List[str]] = None


class DocumentResponse(BaseModel):
    """Document response"""
    document_id: UUID
    organization_id: UUID
    document_name: str
    document_type: str
    description: Optional[str]
    file_url: str
    file_name: Optional[str]
    file_size: Optional[int]
    version: str
    status: str
    has_expiry: bool
    expiry_date: Optional[date]
    requires_signature: bool
    view_count: int
    download_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# Signature Template
class SignatureTemplateCreate(BaseModel):
    """Create signature template"""
    template_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    document_type: Optional[str] = None
    signers: List[dict]  # Array of signer definitions
    signing_order: str = "sequential"
    expiration_days: int = 30
    reminder_frequency_days: int = 3


class SignatureTemplateResponse(BaseModel):
    """Signature template response"""
    template_id: UUID
    organization_id: UUID
    template_name: str
    description: Optional[str]
    document_type: Optional[str]
    signing_order: str
    expiration_days: int
    is_active: bool

    class Config:
        from_attributes = True


# Document Signature
class DocumentSignatureCreate(BaseModel):
    """Create signature request"""
    document_id: UUID
    template_id: Optional[UUID] = None
    signers: List[dict]  # Array of signer info: name, email, order


class DocumentSignatureResponse(BaseModel):
    """Document signature response"""
    signature_id: UUID
    document_id: UUID
    envelope_id: Optional[str]
    status: str
    sent_at: Optional[datetime]
    expiration_date: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentSignerResponse(BaseModel):
    """Document signer response"""
    signer_id: UUID
    signature_id: UUID
    signer_name: str
    signer_email: str
    signer_role: Optional[str]
    signing_order: int
    status: str
    sent_at: Optional[datetime]
    viewed_at: Optional[datetime]
    signed_at: Optional[datetime]

    class Config:
        from_attributes = True


# Document Acknowledgment
class DocumentAcknowledgmentCreate(BaseModel):
    """Acknowledge document"""
    document_id: UUID
    acknowledgment_text: Optional[str] = None


class DocumentAcknowledgmentResponse(BaseModel):
    """Document acknowledgment response"""
    acknowledgment_id: UUID
    document_id: UUID
    employee_id: UUID
    acknowledged: bool
    acknowledged_at: Optional[datetime]

    class Config:
        from_attributes = True
