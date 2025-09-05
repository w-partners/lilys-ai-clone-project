const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../../utils/logger');

class TranscriptionService {
  constructor() {
    // OpenAI API key is optional - only initialize if available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      this.openai = null;
      logger.warn('OpenAI API key not configured - transcription features will be limited');
    }
  }

  /**
   * Transcribe audio file using OpenAI Whisper
   * @param {string} filePath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(filePath, options = {}) {
    try {
      // Check if OpenAI is configured
      if (!this.openai) {
        throw new Error('OpenAI API key not configured');
      }

      // Check if file exists
      await fs.access(filePath);

      // Get file info
      const stats = await fs.stat(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      // OpenAI Whisper has a 25MB limit
      if (fileSizeInMB > 25) {
        logger.warn(`File size ${fileSizeInMB}MB exceeds Whisper limit, will split audio`);
        return await this.transcribeLargeAudio(filePath, options);
      }

      // Read file
      const audioFile = await fs.readFile(filePath);

      // Transcribe using Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: new File([audioFile], path.basename(filePath), { type: 'audio/mpeg' }),
        model: 'whisper-1',
        language: options.language || 'en',
        response_format: 'verbose_json',
        prompt: options.prompt
      });

      // Extract text and additional info
      const result = {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments
      };

      logger.info(`Audio transcribed successfully: ${path.basename(filePath)}`);
      return result;

    } catch (error) {
      logger.error('Audio transcription failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe large audio files by splitting them
   * @param {string} filePath - Path to large audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Combined transcription result
   */
  async transcribeLargeAudio(filePath, options = {}) {
    const tempDir = path.join(path.dirname(filePath), 'temp_chunks');
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Split audio into chunks
      const chunks = await this.splitAudio(filePath, tempDir, 10 * 60); // 10-minute chunks
      
      // Transcribe each chunk
      const transcriptions = [];
      for (const [index, chunkPath] of chunks.entries()) {
        logger.info(`Transcribing chunk ${index + 1}/${chunks.length}`);
        const result = await this.transcribeAudio(chunkPath, options);
        transcriptions.push(result);
        
        // Clean up chunk file
        await fs.unlink(chunkPath);
      }

      // Combine results
      const combinedText = transcriptions.map(t => t.text).join(' ');
      const totalDuration = transcriptions.reduce((sum, t) => sum + (t.duration || 0), 0);
      const allSegments = transcriptions.flatMap(t => t.segments || []);

      return {
        text: combinedText,
        language: transcriptions[0]?.language || 'en',
        duration: totalDuration,
        segments: allSegments
      };

    } finally {
      // Clean up temp directory
      try {
        await fs.rmdir(tempDir);
      } catch (error) {
        logger.warn('Failed to remove temp directory:', error);
      }
    }
  }

  /**
   * Split audio file into chunks
   * @param {string} inputPath - Input audio file path
   * @param {string} outputDir - Output directory for chunks
   * @param {number} chunkDuration - Duration of each chunk in seconds
   * @returns {Promise<Array>} Array of chunk file paths
   */
  async splitAudio(inputPath, outputDir, chunkDuration) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let currentChunk = 0;

      ffmpeg(inputPath)
        .on('start', (cmd) => {
          logger.info('Starting audio split:', cmd);
        })
        .on('error', (err) => {
          logger.error('Audio split error:', err);
          reject(err);
        })
        .on('end', () => {
          logger.info(`Audio split complete: ${chunks.length} chunks created`);
          resolve(chunks);
        })
        .output(path.join(outputDir, 'chunk_%03d.mp3'))
        .outputOptions([
          `-f segment`,
          `-segment_time ${chunkDuration}`,
          `-c copy`
        ])
        .run();

      // Monitor created files
      const checkInterval = setInterval(async () => {
        try {
          const files = await fs.readdir(outputDir);
          const chunkFiles = files
            .filter(f => f.startsWith('chunk_'))
            .sort()
            .map(f => path.join(outputDir, f));
          
          if (chunkFiles.length > chunks.length) {
            chunks.push(...chunkFiles.slice(chunks.length));
          }
        } catch (error) {
          clearInterval(checkInterval);
        }
      }, 1000);
    });
  }

  /**
   * Extract audio from video file
   * @param {string} videoPath - Path to video file
   * @param {string} outputPath - Output audio file path
   * @returns {Promise<string>} Path to extracted audio
   */
  async extractAudioFromVideo(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(outputPath)
        .audioCodec('mp3')
        .audioChannels(1)
        .audioFrequency(16000) // Optimal for speech recognition
        .on('start', (cmd) => {
          logger.info('Extracting audio from video:', cmd);
        })
        .on('error', (err) => {
          logger.error('Audio extraction error:', err);
          reject(err);
        })
        .on('end', () => {
          logger.info('Audio extraction complete');
          resolve(outputPath);
        })
        .run();
    });
  }

  /**
   * Transcribe video file
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeVideo(videoPath, options = {}) {
    const audioPath = videoPath.replace(path.extname(videoPath), '_audio.mp3');

    try {
      // Extract audio from video
      await this.extractAudioFromVideo(videoPath, audioPath);

      // Transcribe the extracted audio
      const result = await this.transcribeAudio(audioPath, options);

      // Clean up extracted audio
      await fs.unlink(audioPath);

      return result;
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(audioPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Generate subtitles/captions from transcription
   * @param {Object} transcription - Transcription result with segments
   * @param {string} format - Output format (srt, vtt)
   * @returns {string} Formatted subtitles
   */
  generateSubtitles(transcription, format = 'srt') {
    if (!transcription.segments || transcription.segments.length === 0) {
      throw new Error('No segments available for subtitle generation');
    }

    const segments = transcription.segments;
    let output = '';

    if (format === 'srt') {
      segments.forEach((segment, index) => {
        output += `${index + 1}\n`;
        output += `${this.formatTime(segment.start, 'srt')} --> ${this.formatTime(segment.end, 'srt')}\n`;
        output += `${segment.text.trim()}\n\n`;
      });
    } else if (format === 'vtt') {
      output = 'WEBVTT\n\n';
      segments.forEach((segment) => {
        output += `${this.formatTime(segment.start, 'vtt')} --> ${this.formatTime(segment.end, 'vtt')}\n`;
        output += `${segment.text.trim()}\n\n`;
      });
    }

    return output;
  }

  /**
   * Format time for subtitles
   * @param {number} seconds - Time in seconds
   * @param {string} format - Format type (srt, vtt)
   * @returns {string} Formatted time
   */
  formatTime(seconds, format) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    if (format === 'srt') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
  }
}

module.exports = new TranscriptionService();