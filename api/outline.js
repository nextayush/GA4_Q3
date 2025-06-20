const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    const { country } = req.query;
    
    if (!country) {
      return res.status(400).json({ 
        error: 'Country parameter is required',
        example: '/api/outline?country=Germany'
      });
    }

    // Validate country name to prevent injection
    if (!/^[a-zA-Z\s-]+$/.test(country)) {
      return res.status(400).json({ 
        error: 'Invalid country name format'
      });
    }

    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(country)}`;
    const response = await axios.get(url, {
      timeout: 5000 // 5 second timeout
    });
    
    if (response.status !== 200) {
      return res.status(404).json({ 
        error: 'Country page not found on Wikipedia'
      });
    }

    const $ = cheerio.load(response.data);
    const headings = [];
    
    // Select only headings from the main content
    $('#content h1, #content h2, #content h3, #content h4, #content h5, #content h6').each((i, el) => {
      const level = parseInt(el.name.substring(1));
      const text = $(el).text().trim();
      if (text) { // Skip empty headings
        headings.push({ level, text });
      }
    });

    if (headings.length === 0) {
      return res.status(404).json({ 
        error: 'No headings found for this country'
      });
    }

    let markdown = '## Contents\n\n';
    headings.forEach(({ level, text }) => {
      markdown += `${'#'.repeat(level)} ${text}\n\n`;
    });
    
    res.setHeader('Content-Type', 'text/markdown');
    return res.status(200).send(markdown);

  } catch (error) {
    console.error('API Error:', error);
    
    if (error.code === 'ENOTFOUND') {
      return res.status(502).json({ 
        error: 'Failed to connect to Wikipedia' 
      });
    }
    
    if (error.response) {
      return res.status(502).json({ 
        error: 'Wikipedia returned an error',
        status: error.response.status
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};