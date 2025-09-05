const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Gmail 설정 (나중에 환경변수로 변경 가능)
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'noreply@lilysai.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
      }
    });

    // 기본 발신자 정보
    this.defaultFrom = process.env.EMAIL_FROM || 'Lilys AI <noreply@lilysai.com>';
  }

  async sendSummaryEmail(to, summaryData, prompts) {
    try {
      const { title, url, results } = summaryData;
      
      // HTML 이메일 템플릿 생성
      const htmlContent = this.generateEmailTemplate(title, url, results, prompts);
      
      const mailOptions = {
        from: this.defaultFrom,
        to: to,
        subject: `[Lilys AI] ${title} - 요약 결과`,
        html: htmlContent,
        text: this.generatePlainTextEmail(title, url, results)
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}:`, info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  generateEmailTemplate(title, url, results, prompts) {
    let tabsHTML = '';
    let contentHTML = '';

    // 각 프롬프트 결과를 탭으로 구성
    prompts.forEach((prompt, index) => {
      const isActive = index === 0 ? 'active' : '';
      const result = results[prompt.id] || '결과 없음';
      
      tabsHTML += `
        <li style="display: inline-block; margin-right: 10px;">
          <a href="#tab-${prompt.id}" style="padding: 10px 20px; background: ${isActive ? '#007bff' : '#f8f9fa'}; color: ${isActive ? '#fff' : '#333'}; text-decoration: none; border-radius: 4px 4px 0 0;">
            ${prompt.name}
          </a>
        </li>
      `;
      
      contentHTML += `
        <div id="tab-${prompt.id}" style="padding: 20px; background: #fff; border: 1px solid #dee2e6; margin-top: -1px; ${!isActive ? 'display: none;' : ''}">
          <h3 style="color: #333; margin-bottom: 15px;">${prompt.name}</h3>
          <div style="color: #666; line-height: 1.6; white-space: pre-wrap;">${result}</div>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Lilys AI 요약</title>
      </head>
      <body style="font-family: 'Noto Sans KR', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <header style="border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #007bff; margin: 0; font-size: 28px;">Lilys AI</h1>
            <p style="color: #666; margin-top: 10px;">AI 기반 콘텐츠 요약 서비스</p>
          </header>
          
          <section style="margin-bottom: 30px;">
            <h2 style="color: #333; font-size: 22px; margin-bottom: 15px;">${title}</h2>
            <p style="color: #666; margin-bottom: 10px;">
              <strong>원본 URL:</strong> 
              <a href="${url}" style="color: #007bff; text-decoration: none;">${url}</a>
            </p>
            <p style="color: #666;">
              <strong>처리 시간:</strong> ${new Date().toLocaleString('ko-KR')}
            </p>
          </section>
          
          <section style="margin-bottom: 30px;">
            <h3 style="color: #333; font-size: 18px; margin-bottom: 15px;">요약 결과</h3>
            
            <ul style="list-style: none; padding: 0; margin-bottom: 20px; border-bottom: 1px solid #dee2e6;">
              ${tabsHTML}
            </ul>
            
            ${contentHTML}
          </section>
          
          <footer style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 40px; text-align: center; color: #666; font-size: 14px;">
            <p>이 이메일은 Lilys AI 서비스에서 자동으로 발송되었습니다.</p>
            <p>문의사항이 있으시면 <a href="mailto:support@lilysai.com" style="color: #007bff;">support@lilysai.com</a>으로 연락주세요.</p>
            <p style="margin-top: 15px;">
              <a href="https://youtube.platformmakers.org" style="color: #007bff; text-decoration: none;">웹사이트 방문</a>
            </p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  generatePlainTextEmail(title, url, results) {
    let content = `Lilys AI - 콘텐츠 요약 결과\n\n`;
    content += `제목: ${title}\n`;
    content += `URL: ${url}\n`;
    content += `처리 시간: ${new Date().toLocaleString('ko-KR')}\n\n`;
    content += `=== 요약 결과 ===\n\n`;
    
    Object.entries(results).forEach(([key, value]) => {
      content += `${key}:\n${value}\n\n`;
    });
    
    content += `\n---\n`;
    content += `이 이메일은 Lilys AI 서비스에서 자동으로 발송되었습니다.\n`;
    content += `웹사이트: https://youtube.platformmakers.org\n`;
    
    return content;
  }

  async sendPasswordResetEmail(to, resetUrl, userName) {
    try {
      const mailOptions = {
        from: this.defaultFrom,
        to: to,
        subject: '[Lilys AI] 비밀번호 재설정 요청',
        html: `
          <div style="font-family: 'Noto Sans KR', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #007bff;">비밀번호 재설정</h2>
            <p>안녕하세요 ${userName}님,</p>
            <p>비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요:</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                비밀번호 재설정
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">이 링크는 1시간 동안만 유효합니다.</p>
            <p style="color: #666; font-size: 14px;">비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시해주세요.</p>
          </div>
        `,
        text: `비밀번호 재설정 링크: ${resetUrl}\n\n이 링크는 1시간 동안만 유효합니다.`
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${to}:`, info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(to, userName) {
    try {
      const mailOptions = {
        from: this.defaultFrom,
        to: to,
        subject: '[Lilys AI] 회원가입을 환영합니다!',
        html: `
          <div style="font-family: 'Noto Sans KR', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #007bff;">Lilys AI에 오신 것을 환영합니다!</h2>
            <p>안녕하세요 ${userName}님,</p>
            <p>Lilys AI 회원이 되신 것을 진심으로 환영합니다.</p>
            <p>이제 다음과 같은 서비스를 이용하실 수 있습니다:</p>
            <ul style="line-height: 2;">
              <li>YouTube 동영상 요약</li>
              <li>웹페이지 콘텐츠 분석</li>
              <li>문서 파일 요약 (PDF, DOCX 등)</li>
              <li>AI 기반 핵심 포인트 추출</li>
              <li>맞춤형 프롬프트 설정</li>
            </ul>
            <div style="margin: 30px 0;">
              <a href="https://youtube.platformmakers.org" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                서비스 시작하기
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">궁금한 점이 있으시면 언제든지 문의해주세요.</p>
          </div>
        `,
        text: `${userName}님, Lilys AI 회원가입을 환영합니다!\n\n웹사이트: https://youtube.platformmakers.org`
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${to}:`, info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email - it's not critical
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();