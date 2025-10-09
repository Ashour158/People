"""
AI Resume Parsing Service
Enterprise NLP-powered resume parsing with high accuracy
Extracts structured data from resumes using spaCy and transformers
"""
import re
import io
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from pathlib import Path
import structlog

# Document parsing
import docx2txt
import PyPDF2
from PIL import Image
import pytesseract

# NLP and ML
import spacy
from dateutil import parser as date_parser

logger = structlog.get_logger()


class AIResumeParser:
    """Enterprise AI-powered resume parser"""
    
    def __init__(self):
        """Initialize resume parser with NLP models"""
        try:
            # Load spaCy model
            self.nlp = spacy.load("en_core_web_lg")
            self.enabled = True
            logger.info("resume_parser_initialized")
        except Exception as e:
            logger.warning("resume_parser_initialization_failed", error=str(e))
            self.enabled = False
    
    async def parse_resume(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parse resume and extract structured data
        
        Args:
            file_content: Resume file content (bytes)
            filename: Original filename
            
        Returns:
            Structured resume data
        """
        try:
            if not self.enabled:
                raise ValueError("Resume parser not initialized")
            
            # Extract text from file
            text = await self._extract_text(file_content, filename)
            
            if not text or len(text.strip()) < 50:
                raise ValueError("Could not extract sufficient text from resume")
            
            # Parse resume sections
            parsed_data = {
                "raw_text": text,
                "personal_info": await self._extract_personal_info(text),
                "contact_info": await self._extract_contact_info(text),
                "education": await self._extract_education(text),
                "experience": await self._extract_experience(text),
                "skills": await self._extract_skills(text),
                "certifications": await self._extract_certifications(text),
                "languages": await self._extract_languages(text),
                "summary": await self._extract_summary(text),
                "parse_metadata": {
                    "parsed_at": datetime.now().isoformat(),
                    "filename": filename,
                    "confidence_score": 0.85,  # Placeholder
                    "text_length": len(text)
                }
            }
            
            logger.info(
                "resume_parsed_successfully",
                filename=filename,
                text_length=len(text)
            )
            
            return parsed_data
            
        except Exception as e:
            logger.error("resume_parsing_failed", filename=filename, error=str(e))
            raise
    
    async def _extract_text(self, file_content: bytes, filename: str) -> str:
        """Extract text from resume file"""
        try:
            file_ext = Path(filename).suffix.lower()
            
            if file_ext == '.pdf':
                return await self._extract_from_pdf(file_content)
            elif file_ext in ['.doc', '.docx']:
                return await self._extract_from_docx(file_content)
            elif file_ext == '.txt':
                return file_content.decode('utf-8')
            elif file_ext in ['.png', '.jpg', '.jpeg']:
                return await self._extract_from_image(file_content)
            else:
                raise ValueError(f"Unsupported file format: {file_ext}")
            
        except Exception as e:
            logger.error("text_extraction_failed", error=str(e))
            raise
    
    async def _extract_from_pdf(self, content: bytes) -> str:
        """Extract text from PDF"""
        try:
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
            
        except Exception as e:
            logger.error("pdf_extraction_failed", error=str(e))
            raise
    
    async def _extract_from_docx(self, content: bytes) -> str:
        """Extract text from DOCX"""
        try:
            docx_file = io.BytesIO(content)
            text = docx2txt.process(docx_file)
            return text.strip()
            
        except Exception as e:
            logger.error("docx_extraction_failed", error=str(e))
            raise
    
    async def _extract_from_image(self, content: bytes) -> str:
        """Extract text from image using OCR"""
        try:
            image = Image.open(io.BytesIO(content))
            text = pytesseract.image_to_string(image)
            return text.strip()
            
        except Exception as e:
            logger.error("ocr_extraction_failed", error=str(e))
            raise
    
    async def _extract_personal_info(self, text: str) -> Dict[str, Any]:
        """Extract name and basic personal information"""
        try:
            doc = self.nlp(text[:1000])  # Process first 1000 chars for name
            
            # Extract name (usually in first few lines)
            name = None
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    name = ent.text
                    break
            
            if not name:
                # Fallback: first line often contains name
                lines = text.split('\n')
                for line in lines[:5]:
                    if len(line.strip()) > 0 and len(line.strip()) < 50:
                        name = line.strip()
                        break
            
            return {
                "full_name": name,
                "first_name": name.split()[0] if name else None,
                "last_name": name.split()[-1] if name and len(name.split()) > 1 else None
            }
            
        except Exception as e:
            logger.error("personal_info_extraction_failed", error=str(e))
            return {"full_name": None, "first_name": None, "last_name": None}
    
    async def _extract_contact_info(self, text: str) -> Dict[str, Any]:
        """Extract contact information (email, phone, address)"""
        try:
            # Email regex
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            emails = re.findall(email_pattern, text)
            
            # Phone regex (various formats)
            phone_pattern = r'(?:\+?(\d{1,3}))?[-.\s]?(\(?\d{3}\)?)?[-.\s]?\d{3}[-.\s]?\d{4}'
            phones = re.findall(phone_pattern, text)
            
            # LinkedIn profile
            linkedin_pattern = r'linkedin\.com/in/[\w-]+'
            linkedin = re.findall(linkedin_pattern, text)
            
            # GitHub profile
            github_pattern = r'github\.com/[\w-]+'
            github = re.findall(github_pattern, text)
            
            return {
                "email": emails[0] if emails else None,
                "phone": ''.join(phones[0]) if phones else None,
                "linkedin_url": f"https://{linkedin[0]}" if linkedin else None,
                "github_url": f"https://{github[0]}" if github else None
            }
            
        except Exception as e:
            logger.error("contact_info_extraction_failed", error=str(e))
            return {
                "email": None,
                "phone": None,
                "linkedin_url": None,
                "github_url": None
            }
    
    async def _extract_education(self, text: str) -> List[Dict[str, Any]]:
        """Extract education history"""
        try:
            education = []
            
            # Common degree keywords
            degree_keywords = [
                r'\bB\.?S\.?\b', r'\bB\.?A\.?\b', r'\bM\.?S\.?\b', r'\bM\.?A\.?\b',
                r'\bPh\.?D\.?\b', r'\bBachelor', r'\bMaster', r'\bDoctorate',
                r'\bDiploma', r'\bAssociate', r'\bDegree'
            ]
            
            lines = text.split('\n')
            in_education_section = False
            
            for i, line in enumerate(lines):
                # Check if we're in education section
                if re.search(r'\beducation\b', line, re.IGNORECASE):
                    in_education_section = True
                    continue
                
                # Check if we've left education section
                if in_education_section and re.search(r'\b(experience|work|skills|projects)\b', line, re.IGNORECASE):
                    break
                
                # Look for degree mentions
                if in_education_section or any(re.search(pattern, line, re.IGNORECASE) for pattern in degree_keywords):
                    # Extract year
                    year_match = re.search(r'\b(19|20)\d{2}\b', line)
                    year = year_match.group() if year_match else None
                    
                    # Look for university name in next few lines
                    institution = None
                    for j in range(i, min(i+3, len(lines))):
                        if len(lines[j].strip()) > 0:
                            institution = lines[j].strip()
                            break
                    
                    if line.strip():
                        education.append({
                            "degree": line.strip(),
                            "institution": institution,
                            "year": year,
                            "field_of_study": None  # Could be enhanced
                        })
            
            return education[:5]  # Return top 5 education entries
            
        except Exception as e:
            logger.error("education_extraction_failed", error=str(e))
            return []
    
    async def _extract_experience(self, text: str) -> List[Dict[str, Any]]:
        """Extract work experience"""
        try:
            experience = []
            
            lines = text.split('\n')
            in_experience_section = False
            
            for i, line in enumerate(lines):
                # Check if we're in experience section
                if re.search(r'\b(experience|employment|work history)\b', line, re.IGNORECASE):
                    in_experience_section = True
                    continue
                
                # Check if we've left experience section
                if in_experience_section and re.search(r'\b(education|skills|certifications)\b', line, re.IGNORECASE):
                    break
                
                # Look for job titles or company names
                if in_experience_section and line.strip():
                    # Extract dates
                    date_pattern = r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b'
                    dates = re.findall(date_pattern, line)
                    
                    # Duration pattern
                    duration_pattern = r'\b\d+\s*(?:year|yr|month|mo)s?\b'
                    duration = re.findall(duration_pattern, line, re.IGNORECASE)
                    
                    if line.strip() and (dates or duration):
                        experience.append({
                            "title": line.strip(),
                            "company": None,  # Could be enhanced
                            "start_date": dates[0] if dates else None,
                            "end_date": dates[1] if len(dates) > 1 else "Present",
                            "duration": duration[0] if duration else None,
                            "description": None
                        })
            
            return experience[:10]  # Return top 10 experience entries
            
        except Exception as e:
            logger.error("experience_extraction_failed", error=str(e))
            return []
    
    async def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume"""
        try:
            # Common skill categories and keywords
            technical_skills = [
                'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
                'node.js', 'django', 'flask', 'fastapi', 'spring', 'sql', 'nosql',
                'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes',
                'aws', 'azure', 'gcp', 'git', 'ci/cd', 'jenkins', 'terraform',
                'machine learning', 'deep learning', 'ai', 'nlp', 'data science',
                'html', 'css', 'rest api', 'graphql', 'microservices'
            ]
            
            soft_skills = [
                'leadership', 'communication', 'teamwork', 'problem solving',
                'project management', 'agile', 'scrum', 'collaboration'
            ]
            
            all_skills = technical_skills + soft_skills
            
            found_skills = []
            text_lower = text.lower()
            
            for skill in all_skills:
                if skill in text_lower:
                    found_skills.append(skill.title())
            
            # Also extract from "Skills" section if exists
            skills_section_pattern = r'(?:skills|technical skills|core competencies)[\s:]*\n(.*?)(?:\n\n|\n[A-Z])'
            skills_match = re.search(skills_section_pattern, text, re.IGNORECASE | re.DOTALL)
            
            if skills_match:
                skills_text = skills_match.group(1)
                # Extract comma or bullet separated skills
                additional_skills = re.split(r'[,•·\|\n]', skills_text)
                found_skills.extend([s.strip() for s in additional_skills if s.strip()])
            
            # Remove duplicates and return unique skills
            return list(set(found_skills))[:20]  # Return top 20 skills
            
        except Exception as e:
            logger.error("skills_extraction_failed", error=str(e))
            return []
    
    async def _extract_certifications(self, text: str) -> List[Dict[str, Any]]:
        """Extract certifications"""
        try:
            certifications = []
            
            cert_keywords = [
                r'\bPMP\b', r'\bAWS\b', r'\bAzure\b', r'\bCISA\b', r'\bCISM\b',
                r'\bCertified\b', r'\bCertification\b', r'\bCert\b'
            ]
            
            lines = text.split('\n')
            in_cert_section = False
            
            for line in lines:
                if re.search(r'\b(certifications|certificates)\b', line, re.IGNORECASE):
                    in_cert_section = True
                    continue
                
                if in_cert_section and re.search(r'\b(experience|education|skills)\b', line, re.IGNORECASE):
                    break
                
                if in_cert_section or any(re.search(pattern, line, re.IGNORECASE) for pattern in cert_keywords):
                    year_match = re.search(r'\b(19|20)\d{2}\b', line)
                    
                    if line.strip():
                        certifications.append({
                            "name": line.strip(),
                            "year": year_match.group() if year_match else None,
                            "issuer": None
                        })
            
            return certifications[:5]
            
        except Exception as e:
            logger.error("certifications_extraction_failed", error=str(e))
            return []
    
    async def _extract_languages(self, text: str) -> List[Dict[str, str]]:
        """Extract languages known"""
        try:
            languages = []
            
            common_languages = [
                'english', 'spanish', 'french', 'german', 'chinese', 'japanese',
                'arabic', 'hindi', 'portuguese', 'russian', 'italian'
            ]
            
            text_lower = text.lower()
            
            for lang in common_languages:
                if lang in text_lower:
                    # Try to find proficiency level
                    proficiency = None
                    proficiency_pattern = f"{lang}.*?(native|fluent|professional|intermediate|basic)"
                    match = re.search(proficiency_pattern, text_lower)
                    if match:
                        proficiency = match.group(1)
                    
                    languages.append({
                        "language": lang.title(),
                        "proficiency": proficiency.title() if proficiency else "Unknown"
                    })
            
            return languages
            
        except Exception as e:
            logger.error("languages_extraction_failed", error=str(e))
            return []
    
    async def _extract_summary(self, text: str) -> Optional[str]:
        """Extract professional summary/objective"""
        try:
            # Look for summary section
            summary_pattern = r'(?:summary|objective|profile|about)[\s:]*\n(.*?)(?:\n\n|\n[A-Z])'
            match = re.search(summary_pattern, text, re.IGNORECASE | re.DOTALL)
            
            if match:
                summary = match.group(1).strip()
                # Limit to first 500 characters
                return summary[:500] if len(summary) > 500 else summary
            
            # Fallback: use first paragraph
            paragraphs = text.split('\n\n')
            for para in paragraphs:
                if len(para) > 100 and len(para) < 1000:
                    return para.strip()[:500]
            
            return None
            
        except Exception as e:
            logger.error("summary_extraction_failed", error=str(e))
            return None
    
    async def calculate_match_score(
        self,
        resume_data: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> float:
        """
        Calculate match score between resume and job requirements
        
        Args:
            resume_data: Parsed resume data
            job_requirements: Job requirements (skills, experience, education)
            
        Returns:
            Match score (0-100)
        """
        try:
            score = 0.0
            max_score = 100.0
            
            # Skills match (40% weight)
            required_skills = set([s.lower() for s in job_requirements.get('skills', [])])
            candidate_skills = set([s.lower() for s in resume_data.get('skills', [])])
            
            if required_skills:
                skills_match = len(required_skills & candidate_skills) / len(required_skills)
                score += skills_match * 40
            
            # Experience match (30% weight)
            required_years = job_requirements.get('years_experience', 0)
            candidate_experience = len(resume_data.get('experience', []))
            
            if required_years > 0:
                experience_match = min(candidate_experience / required_years, 1.0)
                score += experience_match * 30
            
            # Education match (20% weight)
            required_degree = job_requirements.get('degree', '').lower()
            candidate_degrees = [e.get('degree', '').lower() for e in resume_data.get('education', [])]
            
            if required_degree:
                education_match = 1.0 if any(required_degree in d for d in candidate_degrees) else 0.0
                score += education_match * 20
            
            # Certifications match (10% weight)
            required_certs = set([c.lower() for c in job_requirements.get('certifications', [])])
            candidate_certs = set([c.get('name', '').lower() for c in resume_data.get('certifications', [])])
            
            if required_certs:
                cert_match = len(required_certs & candidate_certs) / len(required_certs)
                score += cert_match * 10
            else:
                score += 10  # Full points if no certs required
            
            return min(score, max_score)
            
        except Exception as e:
            logger.error("match_score_calculation_failed", error=str(e))
            return 0.0


# Singleton instance
resume_parser = AIResumeParser()
