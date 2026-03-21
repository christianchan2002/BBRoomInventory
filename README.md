# BB Room Inventory

Mobile-first inventory scanner app for Boys Brigade room operations.

Architecture:
React app -> Google Apps Script web app -> Google Sheet

Important backend boundary:
- Frontend never sends spreadsheet ID or sheet name.
- Apps Script owns spreadsheet linkage and sheet name configuration.

## Google Sheet Tabs

Required sheet tabs:
- Inventory Test
- Transactions Test
- Users Test
- Locations Test

Required columns in `Inventory Test`:
- No
- ID
- Category
- Item
- Location
- Current Qty

Rules:
- `ID` is unique key
- frontend scans/matches by `ID`
- only `Current Qty` is updated
- `Transactions Test` is append-only audit log

## Apps Script Backend

Backend file is in [apps-script/Code.gs](apps-script/Code.gs).

Deploy as a web app:
1. Open the target Google Sheet, then use Extensions -> Apps Script.
2. Paste code from [apps-script/Code.gs](apps-script/Code.gs).
3. Deploy -> New deployment -> Web app.
4. Execute as: Me.
5. Who has access: Anyone with the link (internal).
6. Copy the deployed URL.

Because the script is spreadsheet-bound, Apps Script reads/writes that spreadsheet directly.

## Frontend Configuration

Create `.env.local` from [.env.example](.env.example):

```bash
cp .env.example .env.local
```

Set:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

## Test-First Endpoint Order

Validate each endpoint before using full app flow.

### 1) getUsers

```bash
curl "YOUR_WEB_APP_URL?action=getUsers"
```

Expected shape:

```json
{"ok":true,"data":["User A","User B"]}
```

### 2) getInventoryItemById

```bash
curl "YOUR_WEB_APP_URL?action=getInventoryItemById&id=ERASER-001"
```

Expected shape:

```json
{
  "ok": true,
  "data": {
    "id": "ERASER-001",
    "category": "Stationery",
    "item": "Country Eraser",
    "location": "BB Room",
    "currentQty": 184
  }
}
```

### 3) getStockCheckById

```bash
curl "YOUR_WEB_APP_URL?action=getStockCheckById&id=ERASER-001"
```

Expected shape:

```json
{
  "ok": true,
  "data": {
    "item": {"id":"ERASER-001","item":"Country Eraser","currentQty":184},
    "recentTransactions": []
  }
}
```

### 4) submitSession

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -d '{
    "action":"submitSession",
    "payload":{
      "user":"Christian",
      "mode":"Stock Out",
      "destination":"Draw Out",
      "notes":"Test run",
      "items":[
        {"id":"ERASER-001","itemName":"Country Eraser","qty":2}
      ]
    }
  }'
```

Expected behavior:
- finds each row in `Inventory Test` by `ID`
- subtracts qty for `Stock Out`, adds qty for `Stock In`
- appends one row per item to `Transactions Test`

## Frontend API Actions Wired

The React app now calls these actions through [src/api/appsScriptApi.js](src/api/appsScriptApi.js):
- `getUsers`
- `getInventoryItemById`
- `getStockCheckById`
- `submitSession`

No service account credentials are used in frontend.
No direct Google Sheets API calls are made from browser.
No spreadsheet ID or sheet names are passed from frontend.

## Run

```bash
npm install
npm run dev -- --host
```

Build:

```bash
npm run build
```
