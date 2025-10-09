"""
Internationalization (i18n) Service
Multi-language support for UI with 10+ languages
Translation management and locale handling
"""
import json
from typing import Dict, Any, Optional, List
from pathlib import Path
import structlog

logger = structlog.get_logger()


class I18nService:
    """Enterprise internationalization service"""
    
    # Supported languages
    SUPPORTED_LANGUAGES = {
        "en": {"name": "English", "native_name": "English", "rtl": False},
        "es": {"name": "Spanish", "native_name": "Español", "rtl": False},
        "fr": {"name": "French", "native_name": "Français", "rtl": False},
        "de": {"name": "German", "native_name": "Deutsch", "rtl": False},
        "ar": {"name": "Arabic", "native_name": "العربية", "rtl": True},
        "zh": {"name": "Chinese", "native_name": "中文", "rtl": False},
        "hi": {"name": "Hindi", "native_name": "हिन्दी", "rtl": False},
        "pt": {"name": "Portuguese", "native_name": "Português", "rtl": False},
        "ru": {"name": "Russian", "native_name": "Русский", "rtl": False},
        "ja": {"name": "Japanese", "native_name": "日本語", "rtl": False},
        "it": {"name": "Italian", "native_name": "Italiano", "rtl": False},
    }
    
    def __init__(self):
        """Initialize i18n service"""
        self.translations_dir = Path(__file__).parent.parent / "translations"
        self.translations_dir.mkdir(parents=True, exist_ok=True)
        self.cache: Dict[str, Dict[str, str]] = {}
        self.default_language = "en"
        
        # Initialize base translations
        self._initialize_base_translations()
    
    def _initialize_base_translations(self):
        """Initialize base translation files for all languages"""
        base_translations = {
            # Common
            "common.yes": "Yes",
            "common.no": "No",
            "common.save": "Save",
            "common.cancel": "Cancel",
            "common.delete": "Delete",
            "common.edit": "Edit",
            "common.create": "Create",
            "common.update": "Update",
            "common.search": "Search",
            "common.filter": "Filter",
            "common.export": "Export",
            "common.import": "Import",
            "common.loading": "Loading...",
            "common.error": "Error",
            "common.success": "Success",
            "common.warning": "Warning",
            
            # Navigation
            "nav.dashboard": "Dashboard",
            "nav.employees": "Employees",
            "nav.attendance": "Attendance",
            "nav.leave": "Leave",
            "nav.payroll": "Payroll",
            "nav.performance": "Performance",
            "nav.recruitment": "Recruitment",
            "nav.reports": "Reports",
            "nav.settings": "Settings",
            
            # Employee
            "employee.employee_code": "Employee Code",
            "employee.first_name": "First Name",
            "employee.last_name": "Last Name",
            "employee.email": "Email",
            "employee.phone": "Phone",
            "employee.department": "Department",
            "employee.designation": "Designation",
            "employee.date_of_joining": "Date of Joining",
            "employee.employment_status": "Employment Status",
            "employee.employment_type": "Employment Type",
            
            # Attendance
            "attendance.check_in": "Check In",
            "attendance.check_out": "Check Out",
            "attendance.total_hours": "Total Hours",
            "attendance.status": "Status",
            "attendance.present": "Present",
            "attendance.absent": "Absent",
            "attendance.late": "Late",
            "attendance.on_leave": "On Leave",
            
            # Leave
            "leave.leave_type": "Leave Type",
            "leave.start_date": "Start Date",
            "leave.end_date": "End Date",
            "leave.days": "Days",
            "leave.reason": "Reason",
            "leave.status": "Status",
            "leave.pending": "Pending",
            "leave.approved": "Approved",
            "leave.rejected": "Rejected",
            "leave.balance": "Leave Balance",
            
            # Payroll
            "payroll.basic_salary": "Basic Salary",
            "payroll.allowances": "Allowances",
            "payroll.deductions": "Deductions",
            "payroll.gross_salary": "Gross Salary",
            "payroll.net_salary": "Net Salary",
            "payroll.tax": "Tax",
            "payroll.payslip": "Payslip",
            
            # Performance
            "performance.goals": "Goals",
            "performance.reviews": "Reviews",
            "performance.feedback": "Feedback",
            "performance.rating": "Rating",
            "performance.achievements": "Achievements",
            
            # Recruitment
            "recruitment.job_title": "Job Title",
            "recruitment.candidates": "Candidates",
            "recruitment.interviews": "Interviews",
            "recruitment.offers": "Offers",
            "recruitment.hired": "Hired",
            
            # Reports
            "reports.employee_report": "Employee Report",
            "reports.attendance_report": "Attendance Report",
            "reports.leave_report": "Leave Report",
            "reports.payroll_report": "Payroll Report",
            "reports.custom_report": "Custom Report",
            
            # Time
            "time.today": "Today",
            "time.yesterday": "Yesterday",
            "time.this_week": "This Week",
            "time.this_month": "This Month",
            "time.this_year": "This Year",
            "time.date": "Date",
            "time.time": "Time",
            
            # Messages
            "message.save_success": "Saved successfully",
            "message.delete_success": "Deleted successfully",
            "message.update_success": "Updated successfully",
            "message.create_success": "Created successfully",
            "message.error_occurred": "An error occurred",
            "message.confirm_delete": "Are you sure you want to delete?",
            "message.no_data": "No data available",
            
            # Validation
            "validation.required": "This field is required",
            "validation.invalid_email": "Invalid email address",
            "validation.invalid_phone": "Invalid phone number",
            "validation.min_length": "Minimum length is {min}",
            "validation.max_length": "Maximum length is {max}",
        }
        
        # Save base English translations
        self._save_translations("en", base_translations)
    
    def _save_translations(self, language_code: str, translations: Dict[str, str]):
        """Save translations to file"""
        try:
            file_path = self.translations_dir / f"{language_code}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(translations, f, ensure_ascii=False, indent=2)
            
            # Update cache
            self.cache[language_code] = translations
            
            logger.info("translations_saved", language=language_code, count=len(translations))
            
        except Exception as e:
            logger.error("save_translations_failed", language=language_code, error=str(e))
    
    def load_translations(self, language_code: str) -> Dict[str, str]:
        """
        Load translations for a language
        
        Args:
            language_code: Language code (e.g., 'en', 'es')
            
        Returns:
            Dictionary of translations
        """
        try:
            # Check cache first
            if language_code in self.cache:
                return self.cache[language_code]
            
            # Load from file
            file_path = self.translations_dir / f"{language_code}.json"
            
            if not file_path.exists():
                logger.warning("translations_not_found", language=language_code)
                # Fall back to default language
                if language_code != self.default_language:
                    return self.load_translations(self.default_language)
                return {}
            
            with open(file_path, 'r', encoding='utf-8') as f:
                translations = json.load(f)
            
            # Cache translations
            self.cache[language_code] = translations
            
            return translations
            
        except Exception as e:
            logger.error("load_translations_failed", language=language_code, error=str(e))
            return {}
    
    def translate(
        self,
        key: str,
        language_code: str,
        params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Translate a key to the specified language
        
        Args:
            key: Translation key (e.g., 'common.save')
            language_code: Target language code
            params: Parameters for interpolation
            
        Returns:
            Translated string
        """
        try:
            translations = self.load_translations(language_code)
            
            # Get translation
            translation = translations.get(key)
            
            # Fall back to default language if not found
            if not translation and language_code != self.default_language:
                default_translations = self.load_translations(self.default_language)
                translation = default_translations.get(key)
            
            # Fall back to key if still not found
            if not translation:
                logger.warning("translation_missing", key=key, language=language_code)
                translation = key
            
            # Interpolate parameters
            if params:
                for param_key, param_value in params.items():
                    translation = translation.replace(f"{{{param_key}}}", str(param_value))
            
            return translation
            
        except Exception as e:
            logger.error("translation_failed", key=key, error=str(e))
            return key
    
    def get_supported_languages(self) -> List[Dict[str, Any]]:
        """
        Get list of supported languages
        
        Returns:
            List of language metadata
        """
        return [
            {
                "code": code,
                "name": info["name"],
                "native_name": info["native_name"],
                "rtl": info["rtl"]
            }
            for code, info in self.SUPPORTED_LANGUAGES.items()
        ]
    
    def add_translation(
        self,
        language_code: str,
        key: str,
        value: str
    ):
        """
        Add or update a translation
        
        Args:
            language_code: Language code
            key: Translation key
            value: Translation value
        """
        try:
            translations = self.load_translations(language_code)
            translations[key] = value
            self._save_translations(language_code, translations)
            
            logger.info("translation_added", language=language_code, key=key)
            
        except Exception as e:
            logger.error("add_translation_failed", error=str(e))
    
    def bulk_add_translations(
        self,
        language_code: str,
        translations: Dict[str, str]
    ):
        """
        Add multiple translations at once
        
        Args:
            language_code: Language code
            translations: Dictionary of key-value translations
        """
        try:
            existing = self.load_translations(language_code)
            existing.update(translations)
            self._save_translations(language_code, existing)
            
            logger.info(
                "bulk_translations_added",
                language=language_code,
                count=len(translations)
            )
            
        except Exception as e:
            logger.error("bulk_add_translations_failed", error=str(e))
    
    def export_translations(self, language_code: str) -> Dict[str, str]:
        """
        Export translations for a language
        
        Args:
            language_code: Language code
            
        Returns:
            All translations for the language
        """
        return self.load_translations(language_code)
    
    def get_missing_translations(
        self,
        source_language: str,
        target_language: str
    ) -> List[str]:
        """
        Get list of keys missing in target language
        
        Args:
            source_language: Source language (usually 'en')
            target_language: Target language to check
            
        Returns:
            List of missing translation keys
        """
        try:
            source = self.load_translations(source_language)
            target = self.load_translations(target_language)
            
            missing = [key for key in source.keys() if key not in target]
            
            return missing
            
        except Exception as e:
            logger.error("get_missing_translations_failed", error=str(e))
            return []
    
    def get_translation_coverage(self, language_code: str) -> float:
        """
        Get translation coverage percentage
        
        Args:
            language_code: Language code
            
        Returns:
            Coverage percentage (0-100)
        """
        try:
            default = self.load_translations(self.default_language)
            target = self.load_translations(language_code)
            
            if not default:
                return 0.0
            
            coverage = (len(target) / len(default)) * 100
            return round(coverage, 2)
            
        except Exception as e:
            logger.error("get_translation_coverage_failed", error=str(e))
            return 0.0
    
    def format_date(
        self,
        date_value: Any,
        language_code: str,
        format_type: str = "short"
    ) -> str:
        """
        Format date according to locale
        
        Args:
            date_value: Date to format
            language_code: Language/locale code
            format_type: Format type (short, medium, long)
            
        Returns:
            Formatted date string
        """
        # Placeholder - would use babel or similar for actual date formatting
        return str(date_value)
    
    def format_currency(
        self,
        amount: float,
        currency_code: str,
        language_code: str
    ) -> str:
        """
        Format currency according to locale
        
        Args:
            amount: Amount to format
            currency_code: Currency code (USD, EUR, etc.)
            language_code: Language/locale code
            
        Returns:
            Formatted currency string
        """
        # Placeholder - would use babel for actual currency formatting
        symbols = {
            "USD": "$",
            "EUR": "€",
            "GBP": "£",
            "INR": "₹",
            "AED": "AED",
            "SAR": "SAR"
        }
        
        symbol = symbols.get(currency_code, currency_code)
        return f"{symbol}{amount:,.2f}"
    
    def format_number(
        self,
        number: float,
        language_code: str,
        decimals: int = 2
    ) -> str:
        """
        Format number according to locale
        
        Args:
            number: Number to format
            language_code: Language/locale code
            decimals: Number of decimal places
            
        Returns:
            Formatted number string
        """
        # Placeholder - would use babel for actual number formatting
        return f"{number:,.{decimals}f}"


# Singleton instance
i18n_service = I18nService()
