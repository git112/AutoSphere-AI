from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import urllib.parse
import os

app = FastAPI(title="WhatsApp Web Automation Service")

# Setup Chrome
options = webdriver.ChromeOptions()
# We use a persistent user data dir so we don't need to scan QR code every time
USER_DATA_DIR = os.path.join(os.getcwd(), "chrome-data")
options.add_argument(f"user-data-dir={USER_DATA_DIR}")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

driver = None

@app.on_event("startup")
def startup_event():
    global driver
    
    if os.getenv("RUN_SELENIUM", "false").lower() != "true":
        print("RUN_SELENIUM is not true. Skipping Chrome initialization. (/send-whatsapp will fail until enabled)")
        return
        
    print("Starting Chrome for WhatsApp Web...")
    try:
        # Selenium 4.6+ automatically manages drivers
        driver = webdriver.Chrome(options=options)
        driver.get("https://web.whatsapp.com")
        print("Please scan the QR code manually during the first run if you are not logged in.")
    except Exception as e:
        print(f"CRITICAL: Failed to launch Chrome: {e}")
        driver = None

@app.on_event("shutdown")
def shutdown_event():
    global driver
    if driver:
        driver.quit()

class WhatsAppMessage(BaseModel):
    phone: str
    message: str

@app.post("/send-whatsapp")
def send_whatsapp_message(payload: WhatsAppMessage = Body(...)):
    global driver
    if not driver:
        raise HTTPException(status_code=500, detail="WebDriver not initialized")
    
    encoded_message = urllib.parse.quote(payload.message)
    # Ensure phone has country code. e.g. '919876543210' or '1234567890'
    url = f"https://web.whatsapp.com/send?phone={payload.phone}&text={encoded_message}"
    
    try:
        driver.get(url)
        # Wait until the send button becomes clickable
        # WhatsApp web takes a few seconds to load the chat window
        wait = WebDriverWait(driver, 20)
        
        # The send button on WhatsApp Web changes occasionally, this is a common current selector
        send_button = wait.until(EC.element_to_be_clickable(
            (By.XPATH, '//button[@data-tab="11" or @aria-label="Send"]')
        ))
        send_button.click()
        time.sleep(2) # Give it time to actually send before navigating away
        
        return {"status": "success", "message": f"Sent WhatsApp to {payload.phone}"}
    except Exception as e:
        # Log error and return
        print(f"Error sending to {payload.phone}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
