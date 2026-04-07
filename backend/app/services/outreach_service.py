import io
import re
import smtplib
import logging
from email.mime.text import MIMEText

import pandas as pd
import pdfplumber
import requests
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
    def substitute_template(message: str, name: Optional[str], company: Optional[str]) -> str:
        """Replace {{name}}, {{company}} and common variants (case-insensitive)."""
        out = message or ""
        out = re.sub(r"\{\{\s*name\s*\}\}", name or "there", out, flags=re.I)
        out = re.sub(r"\{\{\s*company\s*\}\}", company or "your company", out, flags=re.I)
        return out

    @staticmethod
    def send_smtp_relay(
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_pass: str,
        to_email: str,
        subject: str,
        body_text: str,
        from_email: Optional[str] = None,
    ) -> None:
        msg = MIMEText(body_text, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email
        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

    @staticmethod
    def trigger_n8n_webhook(webhook_url: str, payload: CampaignPayload, timeout_sec: float = 60.0) -> Dict[str, Any]:
        """Sends campaign and contact payload to the configured n8n Webhook."""
        try:
            data = payload.model_dump(mode="json")

            logger.info("Triggering n8n webhook at %s for campaign '%s'", webhook_url, payload.campaign_name)
            response = requests.post(webhook_url, json=data, timeout=timeout_sec)
            response.raise_for_status()

            n8n_body: Any
            ct = (response.headers.get("Content-Type") or "").lower()
            if "application/json" in ct:
                try:
                    n8n_body = response.json()
                except Exception:
                    n8n_body = response.text
            else:
                n8n_body = response.text

            return {
                "status": "success",
                "message": "Campaign queued successfully to n8n.",
                "n8n_response": n8n_body,
            }
        except requests.exceptions.ConnectionError as e:
            logger.error("Failed to trigger n8n webhook: %s", e)
            raise Exception(
                "Cannot connect to n8n. Start n8n on port 5678 (e.g. "
                "`docker compose -f automation/docker-compose.n8n.yml up` from the repo root, or `npx n8n`). "
                "Use N8N_WEBHOOK_URL=/webhook/... with the workflow Active, or /webhook-test/... only while testing in the n8n editor. "
                f"Original error: {e}"
            ) from e
        except requests.exceptions.HTTPError as e:
            resp = e.response
            if resp is not None and resp.status_code == 404:
                logger.error("n8n webhook 404 for %s", webhook_url)
                raise Exception(
                    "n8n returned 404: no webhook registered for this URL. "
                    "Import automation/workflows/outreach.json into n8n (or run `npm run n8n:import-outreach`), "
                    "turn the workflow Active (ON), and use N8N_WEBHOOK_URL=http://localhost:5678/webhook/outreach-campaign "
                    "(not /webhook-test/ from the API). See automation/N8N_SETUP.md."
                ) from e
            logger.error("Failed to trigger n8n webhook: %s", e)
            raise Exception(f"Failed to communicate with n8n: {str(e)}") from e
        except requests.exceptions.RequestException as e:
            logger.error("Failed to trigger n8n webhook: %s", e)
            raise Exception(f"Failed to communicate with n8n: {str(e)}") from e
