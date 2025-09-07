const ApifyYoutubeService = require('../services/apify/YoutubeService');
const GeminiService = require('../services/ai/GeminiService');
const { emitJobProgress, emitJobComplete, emitJobError } = require('../services/websocket');
const { Job, SourceContent, Summary, SystemPrompt } = require('../models');
const logger = require('../utils/logger');

/**
 * YouTube 처리 작업 워커
 * @param {Object} bullJob - Bull 작업 객체
 */
async function processYoutubeJob(bullJob) {
  const { jobId, sourceUrl, systemPromptIds } = bullJob.data;
  let job = null;

  try {
    logger.info(`Starting YouTube processing for job ${jobId}`);

    // 작업 상태 업데이트
    job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in database`);
    }

    await job.update({
      status: 'processing',
      processingStartedAt: new Date(),
      currentStage: 'subtitle_extraction'
    });

    emitJobProgress(jobId, 'subtitle_extraction', 5, '자막 추출을 시작합니다...');

    // 1. Apify로 자막 추출
    const youtubeService = new ApifyYoutubeService();
    const videoData = await youtubeService.extractSubtitles(
      sourceUrl, 
      jobId, 
      emitJobProgress
    );

    if (!videoData.rawSubtitle) {
      throw new Error('자막을 추출할 수 없습니다. 자막이 없는 영상이거나 비공개 영상일 수 있습니다.');
    }

    // 2. 소스 콘텐츠 저장
    await SourceContent.create({
      jobId: jobId,
      contentType: 'subtitle',
      rawContent: videoData.rawSubtitle,
      language: videoData.language,
      duration: videoData.duration,
      wordCount: videoData.wordCount,
      metadata: {
        title: videoData.title,
        channelName: videoData.channelName,
        viewCount: videoData.viewCount,
        publishedAt: videoData.publishedAt,
        subtitleCount: videoData.subtitles?.length || 0
      }
    });

    emitJobProgress(jobId, 'ai_processing', 20, 'AI 처리를 시작합니다...');

    // 3. 시스템 프롬프트 조회
    const systemPrompts = await SystemPrompt.findAll({
      where: {
        id: systemPromptIds,
        isActive: true
      },
      order: [['orderIndex', 'ASC']]
    });

    if (systemPrompts.length === 0) {
      throw new Error('활성화된 시스템 프롬프트를 찾을 수 없습니다.');
    }

    // 4. AI 처리 준비
    const geminiService = new GeminiService();
    const aiRequests = systemPrompts.map(prompt => ({
      systemPrompt: prompt.prompt,
      content: videoData.rawSubtitle,
      metadata: {
        title: videoData.title,
        channelName: videoData.channelName,
        duration: videoData.duration,
        language: videoData.language
      }
    }));

    // 5. AI 배치 처리
    await job.update({ currentStage: 'ai_batch_processing' });
    
    const progressPerPrompt = Math.floor(60 / systemPrompts.length); // 20%에서 80%까지 60% 할당
    let currentProgress = 20;

    const aiResults = [];
    for (let i = 0; i < aiRequests.length; i++) {
      const request = aiRequests[i];
      const prompt = systemPrompts[i];
      
      try {
        emitJobProgress(
          jobId, 
          'ai_processing', 
          currentProgress, 
          `AI 처리 중... (${i + 1}/${aiRequests.length}) - ${prompt.name}`
        );

        const result = await geminiService.processContent(
          request.systemPrompt,
          request.content,
          request.metadata
        );

        aiResults.push({
          systemPromptId: prompt.id,
          result: result
        });

        // Summary 저장
        await Summary.create({
          jobId: jobId,
          systemPromptId: prompt.id,
          aiProvider: 'gemini',
          content: result.content,
          tokensUsed: result.tokensUsed,
          processingTime: result.processingTime,
          status: 'completed',
          metadata: result.metadata
        });

        currentProgress += progressPerPrompt;
        
      } catch (error) {
        logger.error(`AI processing failed for prompt ${prompt.id}:`, error);
        
        // 실패한 Summary 저장
        await Summary.create({
          jobId: jobId,
          systemPromptId: prompt.id,
          aiProvider: 'gemini',
          content: '',
          status: 'failed',
          errorMessage: error.message,
          metadata: { error: true }
        });

        aiResults.push({
          systemPromptId: prompt.id,
          error: error.message
        });
      }
    }

    emitJobProgress(jobId, 'finalizing', 90, '결과를 정리하고 있습니다...');

    // 6. 작업 완료 처리
    await job.update({
      status: 'completed',
      progress: 100,
      processingCompletedAt: new Date(),
      currentStage: 'completed',
      metadata: {
        videoTitle: videoData.title,
        channelName: videoData.channelName,
        duration: videoData.duration,
        language: videoData.language,
        wordCount: videoData.wordCount,
        processedPrompts: systemPrompts.length,
        successfulPrompts: aiResults.filter(r => !r.error).length
      }
    });

    // 7. 최종 결과 구성
    const completedSummaries = await Summary.findAll({
      where: { jobId: jobId },
      include: [{
        model: SystemPrompt,
        as: 'systemPrompt',
        attributes: ['id', 'name', 'category']
      }],
      order: [['systemPrompt', 'orderIndex', 'ASC']]
    });

    const finalResults = {
      job: {
        id: job.id,
        sourceUrl: job.sourceUrl,
        status: job.status,
        progress: job.progress,
        completedAt: job.processingCompletedAt
      },
      video: {
        title: videoData.title,
        channelName: videoData.channelName,
        duration: videoData.duration,
        language: videoData.language,
        wordCount: videoData.wordCount
      },
      summaries: completedSummaries.map(summary => ({
        id: summary.id,
        systemPrompt: {
          id: summary.systemPrompt.id,
          name: summary.systemPrompt.name,
          category: summary.systemPrompt.category
        },
        content: summary.content,
        status: summary.status,
        error: summary.errorMessage,
        tokensUsed: summary.tokensUsed,
        processingTime: summary.processingTime
      }))
    };

    emitJobProgress(jobId, 'completed', 100, '처리가 완료되었습니다!');
    emitJobComplete(jobId, finalResults);

    logger.info(`YouTube processing completed for job ${jobId}`);
    return finalResults;

  } catch (error) {
    logger.error(`YouTube processing failed for job ${jobId}:`, error);

    // 데이터베이스 작업 실패 업데이트
    if (job) {
      try {
        await job.update({
          status: 'failed',
          errorMessage: error.message,
          processingCompletedAt: new Date(),
          currentStage: 'failed'
        });
      } catch (dbError) {
        logger.error(`Failed to update job status for ${jobId}:`, dbError);
      }
    }

    emitJobError(jobId, error.message, bullJob.data.currentStage || 'unknown');
    throw error;
  }
}

module.exports = {
  processYoutubeJob
};