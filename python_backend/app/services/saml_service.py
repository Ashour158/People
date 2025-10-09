"""
SAML 2.0 SSO Service
Enterprise Single Sign-On authentication with SAML 2.0
Supports Okta, Azure AD, OneLogin, and other SAML providers
"""
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import structlog

from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.settings import OneLogin_Saml2_Settings
from onelogin.saml2.utils import OneLogin_Saml2_Utils

from app.core.config import settings

logger = structlog.get_logger()


class SAMLService:
    """Enterprise SAML 2.0 SSO service"""
    
    def __init__(self):
        """Initialize SAML service"""
        self.saml_settings_dir = Path(__file__).parent.parent / "config" / "saml"
        self.saml_settings_dir.mkdir(parents=True, exist_ok=True)
        
        self.enabled = getattr(settings, 'SAML_ENABLED', False)
        
        if not self.enabled:
            logger.warning("SAML SSO not enabled")
    
    def prepare_saml_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare SAML authentication request
        
        Args:
            request_data: Request data from FastAPI
            
        Returns:
            Prepared SAML request data
        """
        return {
            'https': 'on' if request_data.get('scheme') == 'https' else 'off',
            'http_host': request_data.get('host'),
            'server_port': request_data.get('port', 443 if request_data.get('scheme') == 'https' else 80),
            'script_name': request_data.get('path', '/'),
            'get_data': request_data.get('query_params', {}),
            'post_data': request_data.get('form_data', {}),
        }
    
    async def get_saml_settings(self, organization_id: str) -> Dict[str, Any]:
        """
        Get SAML settings for organization
        
        Args:
            organization_id: Organization UUID
            
        Returns:
            SAML settings dictionary
        """
        try:
            # In production, load from database based on organization
            # For now, return default settings structure
            
            saml_settings = {
                "strict": True,
                "debug": settings.DEBUG,
                "sp": {
                    "entityId": f"{settings.BACKEND_URL}/api/v1/auth/saml/metadata",
                    "assertionConsumerService": {
                        "url": f"{settings.BACKEND_URL}/api/v1/auth/saml/acs",
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                    },
                    "singleLogoutService": {
                        "url": f"{settings.BACKEND_URL}/api/v1/auth/saml/sls",
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
                    "x509cert": "",  # SP certificate
                    "privateKey": "",  # SP private key
                },
                "idp": {
                    "entityId": "",  # IdP entity ID
                    "singleSignOnService": {
                        "url": "",  # IdP SSO URL
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "singleLogoutService": {
                        "url": "",  # IdP SLO URL
                        "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                    },
                    "x509cert": "",  # IdP certificate
                },
                "security": {
                    "nameIdEncrypted": False,
                    "authnRequestsSigned": True,
                    "logoutRequestSigned": True,
                    "logoutResponseSigned": True,
                    "signMetadata": True,
                    "wantMessagesSigned": True,
                    "wantAssertionsSigned": True,
                    "wantAssertionsEncrypted": False,
                    "wantNameId": True,
                    "wantNameIdEncrypted": False,
                    "wantAttributeStatement": True,
                    "requestedAuthnContext": True,
                    "requestedAuthnContextComparison": "exact",
                    "metadataValidUntil": None,
                    "metadataCacheDuration": None,
                    "signatureAlgorithm": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
                    "digestAlgorithm": "http://www.w3.org/2001/04/xmlenc#sha256",
                },
                "contactPerson": {
                    "technical": {
                        "givenName": "Technical Support",
                        "emailAddress": settings.SUPPORT_EMAIL
                    },
                    "support": {
                        "givenName": "Support Team",
                        "emailAddress": settings.SUPPORT_EMAIL
                    }
                },
                "organization": {
                    "en-US": {
                        "name": "HR Management System",
                        "displayname": "HR Management System",
                        "url": settings.FRONTEND_URL
                    }
                }
            }
            
            return saml_settings
            
        except Exception as e:
            logger.error("get_saml_settings_failed", error=str(e))
            raise
    
    async def initiate_sso_login(
        self,
        organization_id: str,
        request_data: Dict[str, Any],
        relay_state: Optional[str] = None
    ) -> str:
        """
        Initiate SSO login flow
        
        Args:
            organization_id: Organization UUID
            request_data: Request data
            relay_state: Optional relay state for redirect after login
            
        Returns:
            SAML AuthN request URL
        """
        try:
            req = self.prepare_saml_request(request_data)
            saml_settings = await self.get_saml_settings(organization_id)
            
            auth = OneLogin_Saml2_Auth(req, saml_settings)
            
            # Generate SAML AuthN request
            sso_url = auth.login(return_to=relay_state)
            
            logger.info("saml_login_initiated", organization_id=organization_id)
            
            return sso_url
            
        except Exception as e:
            logger.error("saml_login_initiation_failed", error=str(e))
            raise
    
    async def process_saml_response(
        self,
        organization_id: str,
        request_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process SAML response from IdP
        
        Args:
            organization_id: Organization UUID
            request_data: Request data with SAML response
            
        Returns:
            User attributes from SAML assertion
        """
        try:
            req = self.prepare_saml_request(request_data)
            saml_settings = await self.get_saml_settings(organization_id)
            
            auth = OneLogin_Saml2_Auth(req, saml_settings)
            
            # Process SAML response
            auth.process_response()
            
            errors = auth.get_errors()
            if errors:
                error_reason = auth.get_last_error_reason()
                logger.error(
                    "saml_response_validation_failed",
                    errors=errors,
                    reason=error_reason
                )
                raise ValueError(f"SAML validation failed: {error_reason}")
            
            # Check authentication status
            if not auth.is_authenticated():
                raise ValueError("SAML authentication failed")
            
            # Extract user attributes
            attributes = auth.get_attributes()
            name_id = auth.get_nameid()
            session_index = auth.get_session_index()
            
            user_data = {
                "name_id": name_id,
                "session_index": session_index,
                "email": attributes.get('email', [name_id])[0] if attributes.get('email') else name_id,
                "first_name": attributes.get('firstName', [''])[0] if attributes.get('firstName') else '',
                "last_name": attributes.get('lastName', [''])[0] if attributes.get('lastName') else '',
                "groups": attributes.get('groups', []) if attributes.get('groups') else [],
                "attributes": attributes
            }
            
            logger.info(
                "saml_authentication_success",
                organization_id=organization_id,
                email=user_data['email']
            )
            
            return user_data
            
        except Exception as e:
            logger.error("saml_response_processing_failed", error=str(e))
            raise
    
    async def initiate_slo(
        self,
        organization_id: str,
        request_data: Dict[str, Any],
        name_id: Optional[str] = None,
        session_index: Optional[str] = None
    ) -> str:
        """
        Initiate Single Logout
        
        Args:
            organization_id: Organization UUID
            request_data: Request data
            name_id: User's SAML name ID
            session_index: SAML session index
            
        Returns:
            SAML logout request URL
        """
        try:
            req = self.prepare_saml_request(request_data)
            saml_settings = await self.get_saml_settings(organization_id)
            
            auth = OneLogin_Saml2_Auth(req, saml_settings)
            
            # Generate SAML logout request
            slo_url = auth.logout(
                name_id=name_id,
                session_index=session_index
            )
            
            logger.info("saml_logout_initiated", organization_id=organization_id)
            
            return slo_url
            
        except Exception as e:
            logger.error("saml_logout_initiation_failed", error=str(e))
            raise
    
    async def process_slo_response(
        self,
        organization_id: str,
        request_data: Dict[str, Any]
    ) -> bool:
        """
        Process SLO response from IdP
        
        Args:
            organization_id: Organization UUID
            request_data: Request data with SLO response
            
        Returns:
            True if logout successful
        """
        try:
            req = self.prepare_saml_request(request_data)
            saml_settings = await self.get_saml_settings(organization_id)
            
            auth = OneLogin_Saml2_Auth(req, saml_settings)
            
            # Process SLO response
            auth.process_slo()
            
            errors = auth.get_errors()
            if errors:
                error_reason = auth.get_last_error_reason()
                logger.error(
                    "saml_slo_validation_failed",
                    errors=errors,
                    reason=error_reason
                )
                return False
            
            logger.info("saml_logout_success", organization_id=organization_id)
            
            return True
            
        except Exception as e:
            logger.error("saml_slo_processing_failed", error=str(e))
            return False
    
    async def get_metadata(self, organization_id: str) -> str:
        """
        Get SP metadata XML
        
        Args:
            organization_id: Organization UUID
            
        Returns:
            SAML metadata XML
        """
        try:
            saml_settings = await self.get_saml_settings(organization_id)
            settings_obj = OneLogin_Saml2_Settings(saml_settings)
            
            metadata = settings_obj.get_sp_metadata()
            errors = settings_obj.validate_metadata(metadata)
            
            if errors:
                logger.error("saml_metadata_validation_failed", errors=errors)
                raise ValueError(f"Invalid metadata: {errors}")
            
            return metadata
            
        except Exception as e:
            logger.error("get_saml_metadata_failed", error=str(e))
            raise
    
    async def configure_okta_saml(
        self,
        organization_id: str,
        okta_domain: str,
        app_id: str,
        certificate: str
    ) -> Dict[str, Any]:
        """
        Configure Okta SAML integration
        
        Args:
            organization_id: Organization UUID
            okta_domain: Okta domain (e.g., mycompany.okta.com)
            app_id: Okta app ID
            certificate: X.509 certificate
            
        Returns:
            SAML configuration
        """
        return {
            "provider": "okta",
            "idp_entity_id": f"http://www.okta.com/{app_id}",
            "idp_sso_url": f"https://{okta_domain}/app/{app_id}/sso/saml",
            "idp_slo_url": f"https://{okta_domain}/app/{app_id}/slo/saml",
            "idp_certificate": certificate,
            "organization_id": organization_id
        }
    
    async def configure_azure_ad_saml(
        self,
        organization_id: str,
        tenant_id: str,
        app_id: str,
        certificate: str
    ) -> Dict[str, Any]:
        """
        Configure Azure AD SAML integration
        
        Args:
            organization_id: Organization UUID
            tenant_id: Azure AD tenant ID
            app_id: Azure AD app ID
            certificate: X.509 certificate
            
        Returns:
            SAML configuration
        """
        return {
            "provider": "azure_ad",
            "idp_entity_id": f"https://sts.windows.net/{tenant_id}/",
            "idp_sso_url": f"https://login.microsoftonline.com/{tenant_id}/saml2",
            "idp_slo_url": f"https://login.microsoftonline.com/{tenant_id}/saml2",
            "idp_certificate": certificate,
            "organization_id": organization_id
        }
    
    async def configure_onelogin_saml(
        self,
        organization_id: str,
        onelogin_domain: str,
        app_id: str,
        certificate: str
    ) -> Dict[str, Any]:
        """
        Configure OneLogin SAML integration
        
        Args:
            organization_id: Organization UUID
            onelogin_domain: OneLogin domain
            app_id: OneLogin app ID
            certificate: X.509 certificate
            
        Returns:
            SAML configuration
        """
        return {
            "provider": "onelogin",
            "idp_entity_id": f"https://{onelogin_domain}",
            "idp_sso_url": f"https://{onelogin_domain}/trust/saml2/http-post/sso/{app_id}",
            "idp_slo_url": f"https://{onelogin_domain}/trust/saml2/http-redirect/slo/{app_id}",
            "idp_certificate": certificate,
            "organization_id": organization_id
        }
    
    def validate_saml_certificate(self, certificate: str) -> bool:
        """
        Validate X.509 certificate format
        
        Args:
            certificate: X.509 certificate string
            
        Returns:
            True if valid
        """
        try:
            # Basic validation
            if not certificate:
                return False
            
            if "BEGIN CERTIFICATE" not in certificate:
                return False
            
            if "END CERTIFICATE" not in certificate:
                return False
            
            return True
            
        except Exception:
            return False


# Singleton instance
saml_service = SAMLService()
