import os
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Header, Depends
from pydantic import BaseModel

from app.services.outreach_service import OutreachService, CampaignPayload, ContactItem

logger = logging.getLogger(__name__)

outreach_router = APIRouter(
    prefix="/api/outreach",
    tags=["Outreach Automation"]
)

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/outreach-campaign")


class RelaySmtpPayload(BaseModel):
    """Called by n8n to send one email using SMTP credentials from the campaign webhook payload."""

    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_pass: str
    to_email: str
    subject: str
    body_text: str


class CampaignLogPayload(BaseModel):
    campaign_name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    channel: str
    status: str
    detail: Optional[str] = None


async def verify_outreach_internal(
    x_outreach_token: Optional[str] = Header(None, alias="X-Outreach-Internal-Token"),
) -> None:
    expected = os.getenv("OUTREACH_INTERNAL_TOKEN")
    if expected and (not x_outreach_token or x_outreach_token != expected):
        raise HTTPException(status_code=403, detail="Invalid or missing X-Outreach-Internal-Token")

@outreach_router.post("/upload-leads")
async def upload_leads(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Upload a CSV, Excel, or PDF file to extract contact details (Names, Emails, Phones).
    """
    valid_extensions = (".csv", ".xlsx", ".xls", ".pdf")
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(status_code=400, detail="Invalid file type. Supported: CSV, Excel, PDF")
    
    file_bytes = await file.read()
    
    try:
        if file.filename.lower().endswith((".csv", ".xls", ".xlsx")):
            contacts = OutreachService.parse_csv_or_excel(file_bytes, file.filename)
        elif file.filename.lower().endswith(".pdf"):
            contacts = OutreachService.parse_pdf(file_bytes)
        else:
            contacts = []
            
        return {
            "status": "success",
            "filename": file.filename,
            "contacts_found": len(contacts),
            "contacts": [c.model_dump() for c in contacts]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")


@outreach_router.post("/start-campaign")
async def start_campaign(payload: CampaignPayload = Body(...)) -> Dict[str, Any]:
    """
    Send campaign data and contact details to the n8n orchestrator webhook.
    """
    if not payload.contacts:
        raise HTTPException(status_code=400, detail="No contacts provided to start campaign.")
    
    try:
        # Trigger the n8n webhook
        result = OutreachService.trigger_n8n_webhook(
            webhook_url=N8N_WEBHOOK_URL,
            payload=payload
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"n8n trigger failed: {str(e)}")


@outreach_router.post("/relay-smtp")
async def relay_smtp(
    payload: RelaySmtpPayload = Body(...),
    _: None = Depends(verify_outreach_internal),
) -> Dict[str, Any]:
    """
    SMTP send using dynamic credentials (for n8n HTTP Request node).
    Protect with OUTREACH_INTERNAL_TOKEN + header X-Outreach-Internal-Token when set.
    """
    try:
        OutreachService.send_smtp_relay(
            smtp_host=payload.smtp_host,
            smtp_port=payload.smtp_port,
            smtp_user=payload.smtp_user,
            smtp_pass=payload.smtp_pass,
            to_email=payload.to_email,
            subject=payload.subject,
            body_text=payload.body_text,
        )
        return {"status": "sent", "to": payload.to_email}
    except Exception as e:
        logger.exception("relay-smtp failed")
        raise HTTPException(status_code=500, detail=str(e))


@outreach_router.post("/campaign-log")
async def campaign_log(
    payload: CampaignLogPayload = Body(...),
    _: None = Depends(verify_outreach_internal),
) -> Dict[str, Any]:
    """Structured log line for n8n workflow completion (extend with DB later)."""
    logger.info(
        "outreach_campaign_log campaign=%s contact=%s channel=%s status=%s detail=%s",
        payload.campaign_name,
        payload.contact_name,
        payload.channel,
        payload.status,
        payload.detail,
    )
    return {"status": "logged"}
