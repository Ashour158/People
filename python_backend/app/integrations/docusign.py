"""DocuSign Integration Service"""
import os
import base64
from typing import Optional, Dict, Any
from datetime import datetime

try:
    from docusign_esign import ApiClient, EnvelopesApi, EnvelopeDefinition
    from docusign_esign import Document, Signer, SignHere, Tabs, Recipients
    DOCUSIGN_AVAILABLE = True
except ImportError:
    DOCUSIGN_AVAILABLE = False


class DocuSignService:
    """Service for DocuSign e-signature integration"""
    
    def __init__(self):
        """Initialize DocuSign service"""
        if not DOCUSIGN_AVAILABLE:
            raise ImportError("docusign-esign package not installed. Install with: pip install docusign-esign")
        
        self.api_client = ApiClient()
        self.api_client.host = os.getenv("DOCUSIGN_BASE_PATH", "https://demo.docusign.net/restapi")
        self.account_id = os.getenv("DOCUSIGN_ACCOUNT_ID")
        self.integration_key = os.getenv("DOCUSIGN_INTEGRATION_KEY")
        self.user_id = os.getenv("DOCUSIGN_USER_ID")
        self.private_key = os.getenv("DOCUSIGN_PRIVATE_KEY", "").replace("\\n", "\n")
        
        # Validate configuration
        if not all([self.account_id, self.integration_key, self.user_id]):
            raise ValueError("DocuSign configuration incomplete. Check environment variables.")
    
    def authenticate(self) -> bool:
        """
        Authenticate with DocuSign using JWT
        
        Returns:
            bool: True if authentication successful
        """
        try:
            if not self.private_key:
                raise ValueError("DOCUSIGN_PRIVATE_KEY not configured")
            
            self.api_client.request_jwt_user_token(
                client_id=self.integration_key,
                user_id=self.user_id,
                oauth_host_name="account-d.docusign.com",
                private_key_bytes=self.private_key.encode(),
                expires_in=3600
            )
            return True
        except Exception as e:
            print(f"DocuSign authentication failed: {str(e)}")
            return False
    
    def send_document_for_signature(
        self,
        document_path: str,
        signer_email: str,
        signer_name: str,
        document_name: str = "Document to Sign",
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a document for e-signature
        
        Args:
            document_path: Path to the document file
            signer_email: Email of the signer
            signer_name: Name of the signer
            document_name: Name of the document
            callback_url: Optional webhook callback URL
        
        Returns:
            Dict containing envelope_id and status
        """
        try:
            # Authenticate
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
            
            # Read document
            with open(document_path, 'rb') as file:
                content = file.read()
            document_base64 = base64.b64encode(content).decode('ascii')
            
            # Create document
            document = Document(
                document_base64=document_base64,
                name=document_name,
                file_extension='pdf',
                document_id='1'
            )
            
            # Create signer
            signer = Signer(
                email=signer_email,
                name=signer_name,
                recipient_id='1',
                routing_order='1'
            )
            
            # Add signature tab
            sign_here = SignHere(
                document_id='1',
                page_number='1',
                x_position='100',
                y_position='150'
            )
            signer.tabs = Tabs(sign_here_tabs=[sign_here])
            
            # Create recipients
            recipients = Recipients(signers=[signer])
            
            # Create envelope definition
            envelope_definition = EnvelopeDefinition(
                email_subject=f"Please sign: {document_name}",
                documents=[document],
                recipients=recipients,
                status='sent'
            )
            
            # Add callback if provided
            if callback_url:
                envelope_definition.event_notification = {
                    "url": callback_url,
                    "includeDocuments": "true",
                    "envelopeEvents": [
                        {"envelopeEventStatusCode": "completed"},
                        {"envelopeEventStatusCode": "declined"},
                        {"envelopeEventStatusCode": "voided"}
                    ]
                }
            
            # Send envelope
            envelopes_api = EnvelopesApi(self.api_client)
            results = envelopes_api.create_envelope(
                account_id=self.account_id,
                envelope_definition=envelope_definition
            )
            
            return {
                "success": True,
                "envelope_id": results.envelope_id,
                "status": results.status,
                "status_datetime": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_envelope_status(self, envelope_id: str) -> Dict[str, Any]:
        """
        Get the status of an envelope
        
        Args:
            envelope_id: The envelope ID
        
        Returns:
            Dict containing envelope status information
        """
        try:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
            
            envelopes_api = EnvelopesApi(self.api_client)
            envelope = envelopes_api.get_envelope(
                account_id=self.account_id,
                envelope_id=envelope_id
            )
            
            return {
                "success": True,
                "envelope_id": envelope_id,
                "status": envelope.status,
                "sent_datetime": envelope.sent_date_time,
                "completed_datetime": envelope.completed_date_time
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def download_signed_document(
        self,
        envelope_id: str,
        save_path: str
    ) -> Dict[str, Any]:
        """
        Download completed/signed document
        
        Args:
            envelope_id: The envelope ID
            save_path: Path to save the downloaded document
        
        Returns:
            Dict with success status and file path
        """
        try:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
            
            envelopes_api = EnvelopesApi(self.api_client)
            document = envelopes_api.get_document(
                account_id=self.account_id,
                envelope_id=envelope_id,
                document_id='combined'  # Get all documents combined
            )
            
            # Save to file
            with open(save_path, 'wb') as file:
                file.write(document)
            
            return {
                "success": True,
                "file_path": save_path
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def void_envelope(self, envelope_id: str, reason: str = "Voided by sender") -> Dict[str, Any]:
        """
        Void an envelope
        
        Args:
            envelope_id: The envelope ID
            reason: Reason for voiding
        
        Returns:
            Dict with success status
        """
        try:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
            
            envelopes_api = EnvelopesApi(self.api_client)
            envelope = EnvelopeDefinition(status='voided', voided_reason=reason)
            
            envelopes_api.update(
                account_id=self.account_id,
                envelope_id=envelope_id,
                envelope=envelope
            )
            
            return {
                "success": True,
                "envelope_id": envelope_id,
                "status": "voided"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
try:
    docusign_service = DocuSignService()
except (ImportError, ValueError) as e:
    print(f"DocuSign service not available: {str(e)}")
    docusign_service = None
