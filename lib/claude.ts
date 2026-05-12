import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('환경 변수 ANTHROPIC_API_KEY가 설정되지 않았습니다.');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = 'claude-sonnet-4-6';
export const MAX_TOKENS = 4096;
export const MAX_HISTORY_MESSAGES = 20;
