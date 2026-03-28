# n8n local setup (outreach)


### Fix (pick one)

**A — Import via UI (simple)**

1. Open http://localhost:5678
2. **Workflows → Import from File** → choose `automation/workflows/outreach.json`  
3. Open the workflow → toggle **Active** (top right) to **ON**  
4. In **Settings → Variables** (or env), set at least **`GEMINI_API_KEY`** if you use AI (matches the workflow’s HTTP node)  
5. Optional: set **`OUTREACH_INTERNAL_TOKEN`** to match `backend/.env` if you use relay auth  

**B — Import via CLI (with Docker running)**

From the **repository root** (where `package.json` lives):

```bash
npm run n8n:import-outreach
```

Then still open the workflow in the UI and turn **Active** **ON** (CLI import usually leaves it inactive).

After you change `automation/workflows/outreach.json`, **import again** (or replace the workflow) so n8n picks up node fixes.

