"""
Document Management API Endpoints
Document library, versioning, access control, and acknowledgments
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date

from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User
from app.models.document import (
    DocumentCategory, Document, SignatureTemplate, DocumentSignature,
    DocumentSigner, DocumentAccessLog, DocumentAcknowledgment,
    DocumentStatus, SignatureStatus
)
from app.schemas.document import (
    DocumentCategoryCreate, DocumentCategoryResponse,
    DocumentCreate, DocumentUpdate, DocumentResponse,
    SignatureTemplateCreate, SignatureTemplateResponse,
    DocumentSignatureCreate, DocumentSignatureResponse,
    DocumentSignerResponse,
    DocumentAcknowledgmentCreate, DocumentAcknowledgmentResponse
)
from app.utils.response import success_response, error_response
from app.utils.pagination import paginate

router = APIRouter(prefix="/documents", tags=["documents"])


# ==========================================
# DOCUMENT CATEGORIES
# ==========================================

@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_document_category(
    category_data: DocumentCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new document category"""
    try:
        # Validate parent category if provided
        if category_data.parent_category_id:
            parent_query = select(DocumentCategory).where(
                DocumentCategory.category_id == category_data.parent_category_id,
                DocumentCategory.organization_id == current_user.organization_id,
                DocumentCategory.is_active == True
            )
            parent_result = await db.execute(parent_query)
            parent = parent_result.scalar_one_or_none()
            
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent category not found"
                )
        
        category = DocumentCategory(
            organization_id=current_user.organization_id,
            **category_data.model_dump()
        )
        
        db.add(category)
        await db.commit()
        await db.refresh(category)
        
        return success_response(
            data=DocumentCategoryResponse.model_validate(category),
            message="Document category created successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create category: {str(e)}"
        )


@router.get("/categories", response_model=List[DocumentCategoryResponse])
async def list_document_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all document categories"""
    try:
        query = select(DocumentCategory).where(
            DocumentCategory.organization_id == current_user.organization_id,
            DocumentCategory.is_active == True
        ).order_by(DocumentCategory.display_order, DocumentCategory.category_name)
        
        result = await db.execute(query)
        categories = result.scalars().all()
        
        return success_response(
            data=[DocumentCategoryResponse.model_validate(c) for c in categories]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch categories: {str(e)}"
        )


# ==========================================
# DOCUMENTS
# ==========================================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_document(
    document_data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new document"""
    try:
        # Validate category if provided
        if document_data.category_id:
            category_query = select(DocumentCategory).where(
                DocumentCategory.category_id == document_data.category_id,
                DocumentCategory.organization_id == current_user.organization_id,
                DocumentCategory.is_active == True
            )
            category_result = await db.execute(category_query)
            category = category_result.scalar_one_or_none()
            
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document category not found"
                )
        
        document = Document(
            organization_id=current_user.organization_id,
            uploaded_by=current_user.user_id,
            status=DocumentStatus.DRAFT,
            view_count=0,
            download_count=0,
            **document_data.model_dump()
        )
        
        db.add(document)
        await db.commit()
        await db.refresh(document)
        
        return success_response(
            data=DocumentResponse.model_validate(document),
            message="Document created successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document: {str(e)}"
        )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    category_id: Optional[UUID] = Query(None),
    document_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all documents"""
    try:
        query = select(Document).where(
            Document.organization_id == current_user.organization_id,
            Document.is_deleted == False,
            Document.is_latest_version == True
        )
        
        # Apply filters
        if category_id:
            query = query.where(Document.category_id == category_id)
        
        if document_type:
            query = query.where(Document.document_type == document_type)
        
        if search:
            query = query.where(
                or_(
                    Document.document_name.ilike(f"%{search}%"),
                    Document.description.ilike(f"%{search}%")
                )
            )
        
        query = query.order_by(Document.created_at.desc())
        
        result = await paginate(db, query, page, limit)
        
        documents = [
            DocumentResponse.model_validate(doc)
            for doc in result["items"]
        ]
        
        return success_response(
            data=documents,
            pagination={
                "page": result["page"],
                "limit": result["limit"],
                "total": result["total"],
                "pages": result["pages"]
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch documents: {str(e)}"
        )


@router.get("/{document_id}")
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get document details"""
    try:
        query = select(Document).where(
            Document.document_id == document_id,
            Document.organization_id == current_user.organization_id,
            Document.is_deleted == False
        )
        result = await db.execute(query)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Log access
        access_log = DocumentAccessLog(
            document_id=document_id,
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            access_type="view"
        )
        db.add(access_log)
        
        # Increment view count
        document.view_count = (document.view_count or 0) + 1
        
        await db.commit()
        await db.refresh(document)
        
        return success_response(data=DocumentResponse.model_validate(document))
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch document: {str(e)}"
        )


@router.put("/{document_id}")
async def update_document(
    document_id: UUID,
    document_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update document details"""
    try:
        query = select(Document).where(
            Document.document_id == document_id,
            Document.organization_id == current_user.organization_id,
            Document.is_deleted == False
        )
        result = await db.execute(query)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Update fields
        update_data = document_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(document, field, value)
        
        document.modified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(document)
        
        return success_response(
            data=DocumentResponse.model_validate(document),
            message="Document updated successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update document: {str(e)}"
        )


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a document (soft delete)"""
    try:
        query = select(Document).where(
            Document.document_id == document_id,
            Document.organization_id == current_user.organization_id,
            Document.is_deleted == False
        )
        result = await db.execute(query)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        document.is_deleted = True
        document.deleted_at = datetime.utcnow()
        document.deleted_by = current_user.user_id
        
        await db.commit()
        
        return success_response(message="Document deleted successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


@router.post("/{document_id}/download")
async def download_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Track document download"""
    try:
        query = select(Document).where(
            Document.document_id == document_id,
            Document.organization_id == current_user.organization_id,
            Document.is_deleted == False
        )
        result = await db.execute(query)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Log download
        access_log = DocumentAccessLog(
            document_id=document_id,
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            access_type="download"
        )
        db.add(access_log)
        
        # Increment download count
        document.download_count = (document.download_count or 0) + 1
        
        await db.commit()
        
        return success_response(
            data={"file_url": document.file_url},
            message="Download logged successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process download: {str(e)}"
        )


# ==========================================
# DOCUMENT SIGNATURES
# ==========================================

@router.post("/signatures", status_code=status.HTTP_201_CREATED)
async def create_signature_request(
    signature_data: DocumentSignatureCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a signature request for a document"""
    try:
        # Verify document exists
        doc_query = select(Document).where(
            Document.document_id == signature_data.document_id,
            Document.organization_id == current_user.organization_id,
            Document.is_deleted == False
        )
        doc_result = await db.execute(doc_query)
        document = doc_result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Create signature request
        signature = DocumentSignature(
            document_id=signature_data.document_id,
            organization_id=current_user.organization_id,
            created_by=current_user.user_id,
            template_id=signature_data.template_id,
            status=SignatureStatus.PENDING
        )
        
        db.add(signature)
        await db.flush()
        
        # Create signer records
        for signer_info in signature_data.signers:
            signer = DocumentSigner(
                signature_id=signature.signature_id,
                organization_id=current_user.organization_id,
                signer_name=signer_info.get("name"),
                signer_email=signer_info.get("email"),
                signer_role=signer_info.get("role"),
                signing_order=signer_info.get("order", 1),
                status=SignatureStatus.PENDING
            )
            db.add(signer)
        
        # Update document status
        document.status = DocumentStatus.PENDING_SIGNATURE
        document.requires_signature = True
        
        await db.commit()
        await db.refresh(signature)
        
        return success_response(
            data=DocumentSignatureResponse.model_validate(signature),
            message="Signature request created successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create signature request: {str(e)}"
        )


@router.get("/signatures/{signature_id}")
async def get_signature_status(
    signature_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get signature request status"""
    try:
        sig_query = select(DocumentSignature).where(
            DocumentSignature.signature_id == signature_id,
            DocumentSignature.organization_id == current_user.organization_id
        )
        sig_result = await db.execute(sig_query)
        signature = sig_result.scalar_one_or_none()
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Signature request not found"
            )
        
        # Get all signers
        signers_query = select(DocumentSigner).where(
            DocumentSigner.signature_id == signature_id
        ).order_by(DocumentSigner.signing_order)
        
        signers_result = await db.execute(signers_query)
        signers = signers_result.scalars().all()
        
        signature_dict = signature.__dict__.copy()
        signature_dict['signers'] = [
            DocumentSignerResponse.model_validate(s) for s in signers
        ]
        
        return success_response(data=signature_dict)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch signature status: {str(e)}"
        )


# ==========================================
# DOCUMENT ACKNOWLEDGMENTS
# ==========================================

@router.post("/acknowledgments", status_code=status.HTTP_201_CREATED)
async def acknowledge_document(
    ack_data: DocumentAcknowledgmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge a document (e.g., policy acknowledgment)"""
    try:
        # Verify document exists
        doc_query = select(Document).where(
            Document.document_id == ack_data.document_id,
            Document.organization_id == current_user.organization_id,
            Document.is_deleted == False
        )
        doc_result = await db.execute(doc_query)
        document = doc_result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check if already acknowledged
        existing_query = select(DocumentAcknowledgment).where(
            DocumentAcknowledgment.document_id == ack_data.document_id,
            DocumentAcknowledgment.employee_id == current_user.employee_id,
            DocumentAcknowledgment.is_deleted == False
        )
        existing_result = await db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document already acknowledged"
            )
        
        # Create acknowledgment
        acknowledgment = DocumentAcknowledgment(
            document_id=ack_data.document_id,
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            acknowledged=True,
            acknowledged_at=datetime.utcnow(),
            acknowledgment_text=ack_data.acknowledgment_text
        )
        
        db.add(acknowledgment)
        await db.commit()
        await db.refresh(acknowledgment)
        
        return success_response(
            data=DocumentAcknowledgmentResponse.model_validate(acknowledgment),
            message="Document acknowledged successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to acknowledge document: {str(e)}"
        )


@router.get("/{document_id}/acknowledgments")
async def get_document_acknowledgments(
    document_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all acknowledgments for a document"""
    try:
        query = select(DocumentAcknowledgment).where(
            DocumentAcknowledgment.document_id == document_id,
            DocumentAcknowledgment.organization_id == current_user.organization_id,
            DocumentAcknowledgment.is_deleted == False
        ).order_by(DocumentAcknowledgment.acknowledged_at.desc())
        
        result = await paginate(db, query, page, limit)
        
        acknowledgments = [
            DocumentAcknowledgmentResponse.model_validate(ack)
            for ack in result["items"]
        ]
        
        return success_response(
            data=acknowledgments,
            pagination={
                "page": result["page"],
                "limit": result["limit"],
                "total": result["total"],
                "pages": result["pages"]
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch acknowledgments: {str(e)}"
        )
