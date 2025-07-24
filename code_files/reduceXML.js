// reduceXML.js

const fs = require('fs');
const cheerio = require('cheerio');
const crypto = require('crypto');
const path = require('path');

const BAD_ATTRS = new Set([
  'style','class','id','width','height','align','valign','bgcolor','border'
]);

function hashUrl(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function clean(rawXML, hyperlinks) {
  const $ = cheerio.load(rawXML, { xmlMode: true });
  $('script,style,meta,link[rel="stylesheet"],head').remove();

  // Remove comments
  $('*')
    .contents()
    .each(function () {
      if (this.type === 'comment') {
        $(this).remove();
      }
    });

  // Remove MSO & VML elements
  $('*').each(function () {
    if (
      this.tagName &&
      (this.tagName.startsWith('mso:') || this.tagName.startsWith('v:'))
    ) {
      $(this).remove();
    }
  });

  // Remove all attributes except href from <a> tags; remove all attributes from other elements
  $('*').each((_, el) => {
    if (el.tagName === 'a') {
      for (const attr of Object.keys(el.attribs)) {
        if (attr.toLowerCase() !== 'href') {
          $(el).removeAttr(attr);
        }
      }
    } else {
      for (const attr of Object.keys(el.attribs)) {
        $(el).removeAttr(attr);
      }
    }
  });

  // Replace <a href> with text + [md5hash], collect mapping
  $('a[href]').each(function () {
    const href = $(this).attr('href');
    if (href) {
      const hash = hashUrl(href);
      hyperlinks[hash] = href;
      const linkText = $(this).text();
      $(this).replaceWith(linkText + ' [' + hash + ']');
    }
  });

  // Remove <p> and <span> that are empty or only contain &nbsp; or non-breaking space
  $('p, span').each(function () {
    const html = $(this).html();
    if (!html || html.trim().replace(/(&nbsp;|\u00A0|\s)/g, '') === '') {
      $(this).remove();
    }
  });

  // Remove <table> structures that are clearly empty (conservative)
  $('table').each(function () {
    const html = $(this).html().replace(/\s/g, '');
    if (
      html === '<tbody><tr><td></td></tr></tbody>' ||
      html === '<tbody><tr><td><p></p></td></tr></tbody>'
    ) {
      $(this).remove();
    }
  });

  // Remove navigation/footer phrases (conservative, only if the element is short and matches exactly)
  $("a, p, span, div").each(function () {
    const text = $(this).text().trim().toLowerCase();
    if (
      text === "view in browser" ||
      text === "subscribe" ||
      text === "submit a tip" ||
      text.startsWith("unsubscribe") ||
      text.startsWith("manage preferences") ||
      text.startsWith("deep learning.ai, 195 page mill road")
    ) {
      $(this).remove();
    }
  });

  // Remove <img> tags at the end of their parent
  $('img').each(function () {
    if ($(this).is(':last-child')) {
      $(this).remove();
    }
  });

  // Clean up HTML entities and spacing (remove &nbsp;, \u00A0, &amp;, &lt;, &gt;, &quot;, &#39;)
  let xml = $.xml();
  xml = xml.replace(/&nbsp;/g, ' ');
  xml = xml.replace(/\u00A0/g, ' ');
  xml = xml.replace(/&amp;/g, '');
  xml = xml.replace(/&lt;/g, '');
  xml = xml.replace(/&gt;/g, '');
  xml = xml.replace(/&quot;/g, '');
  xml = xml.replace(/&#39;/g, '');
  // Remove multiple consecutive <p> </p> (empty paragraphs)
  xml = xml.replace(/(<p>\s*<\/p>\s*){2,}/g, '');

  return xml;
}

function reduceXML(inputFile, cleanedXmlPath, hyperlinkMapPath) {
  const hyperlinks = {};
  const input = fs.readFileSync(inputFile, 'utf8');
  const output = clean(input, hyperlinks);
  fs.writeFileSync(cleanedXmlPath, output);
  fs.writeFileSync(hyperlinkMapPath, JSON.stringify(hyperlinks, null, 2), 'utf8');
  console.log(`✅  Cleaned XML and hyperlink map written: ${cleanedXmlPath}`);
}

// If run directly, use CLI args
if (require.main === module) {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: node reduceXML.js <input-xml-file>');
    process.exit(1);
  }
  const baseName = path.basename(inputFile, '.xml');
  const outputDir = path.join(__dirname, '../reduce_xml');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const cleanedXmlPath = path.join(outputDir, `${baseName}.cleaned.xml`);
  const hyperlinkMapPath = path.join(outputDir, 'hyperlinks_map.json');
  reduceXML(inputFile, cleanedXmlPath, hyperlinkMapPath);
}

module.exports = reduceXML;
