import io
import pandas as pd
import pdfplumber
import re
import requests
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

class ContactItem(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None

class CampaignPayload(BaseModel):
    campaign_name: str
    channel: str # email, whatsapp, both
    subject: Optional[str] = None
    message: str
    enable_ai: bool = False
    
    # SMTP Settings explicitly pushed by user
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    
    contacts: List[ContactItem]

class OutreachService:
    @staticmethod
    def parse_csv_or_excel(file_content: bytes, filename: str) -> List[ContactItem]:
        """Parses CSV and Excel files utilizing Pandas"""
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                df = pd.read_excel(io.BytesIO(file_content))
            
            # Map columns fuzzily
            def _find_col(keywords: List[str]) -> Optional[str]:
                for col in df.columns:
                    for keyword in keywords:
                        if keyword.lower() in str(col).lower():
                            return col
                return None
            
            name_col = _find_col(['name', 'first', 'last'])
            email_col = _find_col(['email', 'mail'])
            phone_col = _find_col(['phone', 'mobile', 'tel'])
            company_col = _find_col(['company', 'org', 'business'])
            
            contacts = []
            for _, row in df.iterrows():
                contact = ContactItem(
                    name=str(row[name_col]) if name_col and pd.notna(row[name_col]) else "Valued Client",
                    email=str(row[email_col]).strip() if email_col and pd.notna(row[email_col]) else None,
                    phone=str(row[phone_col]).strip() if phone_col and pd.notna(row[phone_col]) else None,
                    company=str(row[company_col]).strip() if company_col and pd.notna(row[company_col]) else "Your Company"
                )
                if contact.email or contact.phone:  # Skip if both are missing
                    contacts.append(contact)
                    
            return contacts
        except Exception as e:
            logger.error(f"Error parsing tabular file: {e}")
            raise e

    @staticmethod
    def parse_pdf(file_content: bytes) -> List[ContactItem]:
        """Parses basic PDF unstructured data and attempts to extract emails and phones via Regex."""
        contacts = []
        try:
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
                    
            # Basic Regex for Email and Phone numbers
            email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
            phone_pattern = r'\+?[\d\s-]{10,15}'
            
            emails = re.findall(email_pattern, text)
            phones = re.findall(phone_pattern, text)
            
            # Simple pairing (not 100% accurate for unstructured text, but valid for basic PDFs)
            for i in range(max(len(emails), len(phones))):
                email = emails[i] if i < len(emails) else None
                phone = phones[i].strip() if i < len(phones) else None
                
                # Check valid phone heuristic
                if phone and len(re.sub(r'[\D]', '', phone)) < 10:
                    phone = None
                
                if email or phone:
                    contacts.append(ContactItem(
                        name="Valued Contact",
                        email=email,
                        phone=phone,
                        company="Unknown"
                    ))
            return contacts
        except Exception as e:
            logger.error(f"Error parsing PDF file: {e}")
            raise e

    @staticmethod
    def trigger_n8n_webhook(webhook_url: str, payload: CampaignPayload) -> Dict[str, Any]:
        """Sends campaign and contact payload to the configured n8n Webhook."""
        try:
            # We transform exactly as the system flow example specifies
            data = payload.model_dump()
            
            logger.info(f"Triggering n8n webhook at {webhook_url} for campaign '{payload.campaign_name}'")
            response = requests.post(webhook_url, json=data)
            response.raise_for_status()
            
            return {
                "status": "success",
                "message": "Campaign queued successfully to n8n.",
                "n8n_response": response.json() if "application/json" in response.headers.get("Content-Type", "") else response.text
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to trigger n8n webhook: {e}")
            raise Exception(f"Failed to communicate with n8n: {str(e)}")
