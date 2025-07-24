// Required modules
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// If modifying these SCOPES, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(__dirname, '../token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');
const RAW_XML_DIR = path.join(__dirname, '../raw_xml_files');

const NEWSLETTERS = [
  { email: 'news@alphasignal.ai', name: 'alphasignal' },
  { email: 'noreply@medium.com', name: 'medium' },
  { email: 'hello@mindstream.news', name: 'mindstream' },
  { email: 'aibreakfast@mail.beehiiv.com', name: 'aibreakfast' },
  { email: 'unwindai@mail.beehiiv.com', name: 'unwindai' },
  { email: 'news@daily.therundown.ai', name: 'therundown_daily' },
  { email: 'crew@technews.therundown.ai', name: 'therundown_technews' },
  { email: 'aivalley@substack.com', name: 'aivalley' },
  { email: 'thebatch@deeplearning.ai', name: 'thebatch' },
  { email: 'hi@simple.ai', name: 'simple_ai' },
];

// Load client secrets from a local file.
function loadCredentials() {
  return new Promise((resolve, reject) => {
    fs.readFile(CREDENTIALS_PATH, (err, content) => {
      if (err) return reject('Error loading client secret file:', err);
      resolve(JSON.parse(content));
    });
  });
}

function loadToken() {
  return new Promise((resolve, reject) => {
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return reject('Error loading token file:', err);
      resolve(JSON.parse(token));
    });
  });
}

async function authorize() {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const token = await loadToken();
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

async function fetchNewsletterEmails(gmail, newsletter, maxResults = 5) {
  const after = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000); // 30 days ago (in seconds)
  const query = `from:${newsletter.email} after:${after}`;
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });
  return res.data.messages || [];
}

async function fetchEmailHtml(gmail, messageId) {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  const parts = res.data.payload.parts || [];
  let html = '';
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      break;
    }
  }
  // Fallback: sometimes the html is in the body directly
  if (!html && res.data.payload.body && res.data.payload.body.data) {
    html = Buffer.from(res.data.payload.body.data, 'base64').toString('utf-8');
  }
  return html;
}

async function saveAsXml(newsletterName, date, html) {
  const fileName = `${newsletterName}_${date}.xml`;
  const filePath = path.join(RAW_XML_DIR, fileName);
  const xmlContent = `<${newsletterName}>\n<html>\n${html}\n</html>\n</${newsletterName}>`;
  fs.writeFileSync(filePath, xmlContent, 'utf-8');
  console.log(`Saved: ${filePath}`);
}

async function main() {
  if (!fs.existsSync(RAW_XML_DIR)) fs.mkdirSync(RAW_XML_DIR);
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  for (const newsletter of NEWSLETTERS) {
    const messages = await fetchNewsletterEmails(gmail, newsletter, 5);
    for (const msg of messages) {
      const res = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['Date'] });
      const dateHeader = res.data.payload.headers.find(h => h.name === 'Date');
      const date = dateHeader ? new Date(dateHeader.value) : new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const html = await fetchEmailHtml(gmail, msg.id);
      await saveAsXml(newsletter.name, dateStr, html);
    }
  }
}

main().catch(console.error); 