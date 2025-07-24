const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

// Function to clean article text
function decodeEntities(str) {
  return str
    // Hexadecimal
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Decimal
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    // Named (very basic, for common ones)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
function cleanText(text) {
  text = decodeEntities(text);
  return text
    .replace(/&nbsp;|nbsp;|\\u00A0/g, ' ')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function recoverLinks(text, hyperlinkMap) {
  // Match: link text (possibly with trailing space) followed by [md5hash]
  const linkRegex = /([^\[]+?)\s*\[([a-fA-F0-9]{32})\]/g;
  let match;
  let urls = [];
  let urlCount = 1;
  let hashes = new Set();
  while ((match = linkRegex.exec(text)) !== null) {
    const hash = match[2];
    if (hyperlinkMap[hash] && !hashes.has(hash)) {
      let obj = {};
      obj[`url${urlCount}`] = hyperlinkMap[hash];
      urls.push(obj);
      urlCount++;
      hashes.add(hash);
    }
  }
  return urls;
}

function extractBatchJson(cleanedXmlPath, jsonOutPath) {
  const xml = fs.readFileSync(cleanedXmlPath, 'utf8');
  const $ = cheerio.load(xml, { xmlMode: true });
  // Read hyperlink map if available
  let hyperlinkMap = {};
  const mapPath = path.join(path.dirname(cleanedXmlPath), 'hyperlinks_map.json');
  if (fs.existsSync(mapPath)) {
    hyperlinkMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  }
  const content = [];
  const h1s = $('h1').toArray();
  for (let i = 0; i < h1s.length; i++) {
    const h1 = h1s[i];
    const contentTitle = $(h1).text().trim();
    if (contentTitle.toLowerCase() === 'news') continue;
    // Collect content nodes until next <h1> or end
    let contentNodes = [];
    let node = h1.nextSibling;
    while (node && !(node.type === 'tag' && node.name === 'h1')) {
      if (node.type === 'text') {
        contentNodes.push(node.data);
      } else {
        contentNodes.push($.html(node));
      }
      node = node.nextSibling;
    }
    let contentHtml = contentNodes.join('').replace(/\r?\n/g, '\n').trim();
    let content_String = cheerio.load('<div>' + contentHtml + '</div>', { xmlMode: true })('div').text().trim();
    // Recover links and remove hash markers from text
    const sourceUrl = recoverLinks(content_String, hyperlinkMap);
    content_String = content_String.replace(/\s*\[[a-fA-F0-9]{32}\]/g, '');
    content_String = cleanText(content_String);
    content.push({
      segment: '',
      contentType: '',
      contentId: '',
      contentTitle,
      content_String,
      sourceUrl
    });
  }
  // Extract date from filename (YYYYMMDD)
  const filename = path.basename(cleanedXmlPath);
  const dateMatch = filename.match(/thebatch_(\d{4})(\d{2})(\d{2})\.cleaned\.xml$/);
  let date = '';
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  const result = {
    newsletterName: 'the@Batch',
    date,
    content,
    extractedAt: new Date().toISOString()
  };
  fs.writeFileSync(jsonOutPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ Extracted JSON written: ${jsonOutPath}`);
}

// If run directly, use CLI args
if (require.main === module) {
  const cleanedXmlPath = process.argv[2];
  if (!cleanedXmlPath) {
    console.error('Usage: node batch_xml_json.js <cleaned-xml-file>');
    process.exit(1);
  }
  const filename = path.basename(cleanedXmlPath);
  const dateMatch = filename.match(/thebatch_(\d{4})(\d{2})(\d{2})\.cleaned\.xml$/);
  let date = '';
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  const outputDir = path.join(__dirname, '../extracted_json_files');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const jsonOutPath = path.join(outputDir, `batch_json_${date}.json`);
  extractBatchJson(cleanedXmlPath, jsonOutPath);
}

module.exports = extractBatchJson; 