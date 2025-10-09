"""
E-signature and Document Management Models
DocuSign integration and document lifecycle management
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class DocumentType(str, enum.Enum):
    """Document types"""
    OFFER_LETTER = "offer_letter"
    CONTRACT = "contract"
    NDA = "nda"
    POLICY = "policy"
    FORM = "form"
    CERTIFICATE = "certificate"
    HANDBOOK = "handbook"
    PERFORMANCE_REVIEW = "performance_review"
    TERMINATION_LETTER = "termination_letter"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    """Document status"""
    DRAFT = "draft"
    PENDING_SIGNATURE = "pending_signature"
    PARTIALLY_SIGNED = "partially_signed"
    SIGNED = "signed"
    COMPLETED = "completed"
    EXPIRED = "expired"
    DECLINED = "declined"
    VOIDED = "voided"


class SignatureStatus(str, enum.Enum):
    """Signature status"""
    PENDING = "pending"
    SENT = "sent"
    VIEWED = "viewed"
    SIGNED = "signed"
    DECLINED = "declined"


class DocumentCategory(Base):
    """Document library categories"""
    __tablename__ = "document_categories"
    
    category_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    category_name = Column(String(200), nullable=False)
    description = Column(Text)
    parent_category_id = Column(UUID(as_uuid=True), ForeignKey("document_categories.category_id"))
    
    # Permissions
    required_role = Column(String(50))  # Minimum role to access
    
    # Display
    icon = Column(String(100))
    display_order = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    documents = relationship("Document", back_populates="category")


class Document(Base):
    """Document library and management"""
    __tablename__ = "documents"
    
    document_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("document_categories.category_id"), index=True)
    
    # Document details
    document_name = Column(String(500), nullable=False)
    document_type = Column(SQLEnum(DocumentType), nullable=False, index=True)
    description = Column(Text)
    
    # File details
    file_url = Column(String(1000), nullable=False)
    file_name = Column(String(500))
    file_size = Column(Integer)  # bytes
    file_type = Column(String(100))  # PDF, DOCX, etc.
    
    # Version control
    version = Column(String(20), default="1.0")
    parent_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id"))
    is_latest_version = Column(Boolean, default=True)
    
    # Status
    status = Column(String(50), default="active")
    
    # Expiry
    has_expiry = Column(Boolean, default=False)
    expiry_date = Column(Date)
    expiry_reminder_sent = Column(Boolean, default=False)
    
    # Access control
    is_public = Column(Boolean, default=False)
    target_employees = Column(JSON)  # Array of employee IDs
    target_departments = Column(JSON)
    target_roles = Column(JSON)
    
    # E-signature
    requires_signature = Column(Boolean, default=False)
    signature_template_id = Column(UUID(as_uuid=True))
    
    # Related entity
    related_entity_type = Column(String(50))  # employee, recruitment, etc.
    related_entity_id = Column(UUID(as_uuid=True))
    
    # Metadata
    tags = Column(JSON)  # Array of tags
    checksum = Column(String(255))  # For integrity verification
    
    # Tracking
    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    
    # Authorship
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Soft delete
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True))
    deleted_by = Column(UUID(as_uuid=True))
    
    # Relationships
    category = relationship("DocumentCategory", back_populates="documents")
    signatures = relationship("DocumentSignature", back_populates="document", cascade="all, delete-orphan")
    access_logs = relationship("DocumentAccessLog", back_populates="document", cascade="all, delete-orphan")


class SignatureTemplate(Base):
    """Templates for signature workflows"""
    __tablename__ = "signature_templates"
    
    template_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Template details
    template_name = Column(String(255), nullable=False)
    description = Column(Text)
    document_type = Column(SQLEnum(DocumentType))
    
    # Signature workflow
    signers = Column(JSON)  # Array of signer definitions with order, role, etc.
    signing_order = Column(String(20), default="sequential")  # sequential or parallel
    
    # Settings
    expiration_days = Column(Integer, default=30)
    reminder_frequency_days = Column(Integer, default=3)
    
    # DocuSign settings
    docusign_template_id = Column(String(255))
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class DocumentSignature(Base):
    """Document signature requests and tracking"""
    __tablename__ = "document_signatures"
    
    signature_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("signature_templates.template_id"))
    
    # Envelope (if using DocuSign)
    envelope_id = Column(String(255), unique=True, index=True)
    
    # Document to sign
    original_document_url = Column(String(1000))
    signed_document_url = Column(String(1000))
    
    # Status
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING_SIGNATURE, index=True)
    
    # Timing
    sent_at = Column(DateTime(timezone=True))
    expiration_date = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    voided_at = Column(DateTime(timezone=True))
    void_reason = Column(Text)
    
    # Initiator
    initiated_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="signatures")
    signers = relationship("DocumentSigner", back_populates="signature", cascade="all, delete-orphan")
    audit_trail = relationship("SignatureAuditTrail", back_populates="signature", cascade="all, delete-orphan")


class DocumentSigner(Base):
    """Individual signers for a document"""
    __tablename__ = "document_signers"
    
    signer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signature_id = Column(UUID(as_uuid=True), ForeignKey("document_signatures.signature_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), index=True)
    
    # Signer details (in case of external signer)
    signer_name = Column(String(255), nullable=False)
    signer_email = Column(String(255), nullable=False)
    signer_role = Column(String(100))  # employee, manager, witness, etc.
    
    # Order
    signing_order = Column(Integer, default=1)
    
    # Status
    status = Column(SQLEnum(SignatureStatus), default=SignatureStatus.PENDING, index=True)
    
    # Actions
    sent_at = Column(DateTime(timezone=True))
    viewed_at = Column(DateTime(timezone=True))
    signed_at = Column(DateTime(timezone=True))
    declined_at = Column(DateTime(timezone=True))
    decline_reason = Column(Text)
    
    # DocuSign recipient ID
    recipient_id = Column(String(255))
    
    # IP and location (for legal compliance)
    ip_address = Column(String(45))
    location = Column(String(255))
    
    # Relationships
    signature = relationship("DocumentSignature", back_populates="signers")


class SignatureAuditTrail(Base):
    """Audit trail for signature events"""
    __tablename__ = "signature_audit_trail"
    
    audit_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signature_id = Column(UUID(as_uuid=True), ForeignKey("document_signatures.signature_id"), nullable=False, index=True)
    
    event_type = Column(String(100), nullable=False)  # sent, viewed, signed, declined, etc.
    event_description = Column(Text)
    
    # Actor
    actor_email = Column(String(255))
    actor_name = Column(String(255))
    
    # Technical details
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    location = Column(String(255))
    
    # Timestamp
    event_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    signature = relationship("DocumentSignature", back_populates="audit_trail")


class DocumentAccessLog(Base):
    """Track document views and downloads"""
    __tablename__ = "document_access_logs"
    
    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), index=True)
    
    # Access details
    action = Column(String(50), nullable=False)  # viewed, downloaded, printed
    
    # Technical details
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    # Timestamp
    accessed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="access_logs")


class DocumentAcknowledgment(Base):
    """Employee acknowledgment of policies and documents"""
    __tablename__ = "document_acknowledgments"
    
    acknowledgment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.document_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Acknowledgment
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True))
    
    # Details
    acknowledgment_text = Column(Text)  # "I have read and understood..."
    ip_address = Column(String(45))
    
    # Reminder
    reminder_sent_at = Column(DateTime(timezone=True))
    reminder_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
