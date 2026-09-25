# Connect the Dawn board to Google Sheets

The second homepage works now with browser storage. Its preview notice tells visitors that cards and votes stay in their browser. The six cards signed Varun are examples built into the page; they are not submitted to Google Sheets.

## Set up the shared board

1. Create a Google Sheet for the board. From that Sheet, open **Extensions → Apps Script**. Replace the starter script with the complete contents of `apps-script.gs` and save.
2. Run `boardSheet` once in the editor. Authorize the script with the Google account that owns the Sheet. It creates an **Unstuck board** tab with six columns: `id`, `type`, `prompt`, `text`, `name`, and `timestamp`.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Deploy when you are ready for visitors to read and add public cards. The Google Sheet itself can remain private; the web app exposes the board rows. If your Workspace account does not offer public access, use an account that permits it.
4. Copy the deployed URL ending in `/exec`. Put it between the quotes in the first line of `board.js`: `const SHEET_URL = '';`. Commit and push that change to publish it on GitHub Pages.
5. Open the Dawn homepage in a fresh browser window. The composer should say **Cards are public**. Submit a short test card, reload in another browser, and confirm that the card appears in both places and in the Sheet. Delete the test row from the Sheet when finished.

After changing the Apps Script code, edit the deployment and choose a new version. Keep its `/exec` URL. The `/dev` testing URL requires access to your script and should not go in the website.

## What gets saved

The website sends `{ id, type, prompt, text, name, timestamp }` as JSON with a `text/plain` content type. Google supplies the stored timestamp. `doGet` returns `{ ok: true, rows: [...] }`; `doPost` returns `{ ok: true, id }` only after a write succeeds or the same ID is already present.

User text is displayed with `textContent`. In the Sheet, it is written as literal rich text, so a leading formula character remains text. Server checks enforce the four prompts, five poll options, 280-character cards, and 60-character names. A script lock and unique request ID prevent a retried request from adding the same row twice.

One vote per browser is enforced with localStorage. Clearing browser data or using another browser allows another vote. This is a lightweight feedback poll, not a verified ballot. The public web app has no sign-in or moderation queue; anyone with its URL can read board rows and send valid submissions. Review the Sheet and remove unwanted rows there.

## Offline or unconfigured use

If `SHEET_URL` is empty, cards and votes stay in localStorage. If a request fails or its success cannot be confirmed, the interface says the item was saved in this browser. The board stays local for the rest of that visit; reloading tries the connection again. Submission controls stay disabled while the first connection is pending, so the public/local notice is settled before someone submits. A successful server write can occasionally be followed by a blocked response; IDs prevent that row from appearing twice when the board is read again.

If browser storage is unavailable or full, the interface says the entry will last only while the page is open. Existing local entries are never silently uploaded when the Sheet is connected later. Write a new card to share it.

Requests time out after nine seconds. The client follows Google's response redirect and requires readable JSON; it never treats an opaque `no-cors` response as confirmation. If the board falls back locally after setup, check the `/exec` URL, **Anyone** access, deployment version, and the browser's network errors. Do not switch to `no-cors` to hide an error.

Google's documentation: [Web app deployment](https://developers.google.com/apps-script/guides/web), [Content Service and response redirects](https://developers.google.com/apps-script/guides/content), [Spreadsheet rich-text methods](https://developers.google.com/apps-script/reference/spreadsheet/range).
