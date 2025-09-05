const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../../utils/logger');
const TranscriptionService = require('./TranscriptionService');

class ContentExtractor {
  constructor() {
    this.supportedTypes = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
      'text/html': 'html',
      'audio/mpeg': 'audio',
      'audio/wav': 'audio',
      'video/mp4': 'video',
      'video/webm': 'video'
    };
  }

  async extract(fileData, contentType) {
    const mimeType = fileData.mimetype || contentType;
    const extractorType = this.supportedTypes[mimeType];

    if (!extractorType) {
      throw new Error(`Unsupported content type: ${mimeType}`);
    }

    logger.info(`Extracting content from ${extractorType} file`, {
      filename: fileData.originalname,
      size: fileData.size
    });

    try {
      switch (extractorType) {
        case 'pdf':
          return await this.extractFromPDF(fileData.buffer);
        case 'docx':
          return await this.extractFromDOCX(fileData.buffer);
        case 'txt':
          return await this.extractFromTXT(fileData.buffer);
        case 'html':
          return await this.extractFromHTML(fileData.buffer.toString());
        case 'audio':
        case 'video':
          return await this.extractFromMediaFile(fileData);
        default:
          throw new Error(`No extractor available for type: ${extractorType}`);
      }
    } catch (error) {
      logger.error(`Content extraction failed for ${extractorType}:`, error);
      throw new Error(`Failed to extract content: ${error.message}`);
    }
  }

  async extractFromPDF(buffer) {
    try {
      const data = await pdf(buffer);
      const text = data.text.trim();
      
      if (!text) {
        throw new Error('No text content found in PDF');
      }

      return {
        text,
        pages: data.numpages,
        metadata: {
          title: data.info?.Title || null,
          author: data.info?.Author || null,
          subject: data.info?.Subject || null
        }
      };
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  async extractFromDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      
      if (!text) {
        throw new Error('No text content found in DOCX');
      }

      return {
        text,
        warnings: result.messages.filter(m => m.type === 'warning'),
        metadata: {
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  }

  async extractFromTXT(buffer) {
    try {
      const text = buffer.toString('utf-8').trim();
      
      if (!text) {
        throw new Error('Empty text file');
      }

      return {
        text,
        encoding: 'utf-8',
        metadata: {
          size: buffer.length,
          lineCount: text.split('\n').length
        }
      };
    } catch (error) {
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }

  async extractFromHTML(htmlContent) {
    try {
      // Launch headless browser
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.setContent(htmlContent);
      
      // Extract text content, removing scripts and styles
      const text = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        return document.body.innerText || document.body.textContent || '';
      });
      
      await browser.close();
      
      if (!text.trim()) {
        throw new Error('No text content found in HTML');
      }

      return {
        text: text.trim(),
        metadata: {
          extractedAt: new Date().toISOString(),
          method: 'puppeteer'
        }
      };
    } catch (error) {
      throw new Error(`HTML extraction failed: ${error.message}`);
    }
  }

  async extractFromMediaFile(fileData) {
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${Date.now()}_${fileData.originalname}`);
    
    try {
      // Write buffer to temporary file
      await fs.writeFile(tempFilePath, fileData.buffer);
      
      let transcriptionResult;
      
      // Determine if it's audio or video
      if (fileData.mimetype.startsWith('audio/')) {
        transcriptionResult = await TranscriptionService.transcribeAudio(tempFilePath);
      } else if (fileData.mimetype.startsWith('video/')) {
        transcriptionResult = await TranscriptionService.transcribeVideo(tempFilePath);
      } else {
        throw new Error(`Unsupported media type: ${fileData.mimetype}`);
      }
      
      // Clean up temp file
      await fs.unlink(tempFilePath);
      
      return {
        text: transcriptionResult.text,
        metadata: {
          filename: fileData.originalname,
          size: fileData.size,
          mimetype: fileData.mimetype,
          duration: transcriptionResult.duration,
          language: transcriptionResult.language,
          extractedAt: new Date().toISOString(),
          method: 'whisper'
        }
      };
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      logger.error('Media file extraction failed:', error);
      
      // Fallback response when transcription fails
      return {
        text: `[Media file: ${fileData.originalname}] - Transcription failed: ${error.message}`,
        metadata: {
          filename: fileData.originalname,
          size: fileData.size,
          mimetype: fileData.mimetype,
          error: error.message,
          note: 'Ensure OpenAI API key is configured for transcription'
        }
      };
    }
  }

  async extractFromURL(url) {
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      const content = await page.evaluate(() => {
        // Remove unnecessary elements
        const unwanted = document.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ads');
        unwanted.forEach(el => el.remove());
        
        // Try to find main content
        const main = document.querySelector('main, article, .content, .post, .entry') || document.body;
        
        return {
          title: document.title,
          text: main.innerText || main.textContent || '',
          url: window.location.href
        };
      });
      
      await browser.close();
      
      if (!content.text.trim()) {
        throw new Error('No content found on the webpage');
      }

      return {
        text: content.text.trim(),
        metadata: {
          title: content.title,
          url: content.url,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`URL extraction failed: ${error.message}`);
    }
  }

  getSupportedTypes() {
    return Object.keys(this.supportedTypes);
  }

  isSupported(mimeType) {
    return mimeType in this.supportedTypes;
  }
}

module.exports = ContentExtractor;