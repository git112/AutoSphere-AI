import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from typing import List, Dict, Any

from app.services.outreach_service import OutreachService, CampaignPayload, ContactItem

outreach_router = APIRouter(
    prefix="/api/outreach",
    tags=["Outreach Automation"]
)

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/outreach-campaign")

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
