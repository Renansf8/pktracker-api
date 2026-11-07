import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export interface ModelCall {
  /** Log prefix, e.g. "genui" or "genui-commentary". */
  tag: string;
  userId: string;
  model: string;
  system: string;
  schema: Record<string, unknown>;
  content: string;
  maxTokens: number;
  /** Extra `key=value` pairs for the log line. Counts only, never user data. */
  logExtra?: string;
  refusalMessage: string;
}

/**
 * One structured-output call to Claude: effort low, top-level prompt caching,
 * Anthropic errors mapped to HTTP errors, and one log line with token counts.
 * Throws on rate limit, connection/API errors and refusals; callers still
 * decide what a `max_tokens` or unparsable reply means.
 */
export async function callClaude(
  client: Anthropic,
  logger: Logger,
  call: ModelCall,
): Promise<Anthropic.Message> {
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: call.model,
      max_tokens: call.maxTokens,
      cache_control: { type: 'ephemeral' },
      system: call.system,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: call.schema },
      },
      messages: [{ role: 'user', content: call.content }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new HttpException(
        'O serviço de IA está ocupado. Tente de novo em instantes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      logger.error(`${call.tag} connection error: ${error.message}`);
      throw new ServiceUnavailableException(
        'Não foi possível falar com o serviço de IA.',
      );
    }
    if (error instanceof Anthropic.APIError) {
      logger.error(
        `${call.tag} API error status=${error.status} type=${error.type}: ${error.message}`,
      );
      throw new BadGatewayException(
        'O serviço de IA retornou um erro. Tente de novo mais tarde.',
      );
    }
    throw error;
  }

  logger.log(
    `${call.tag} user=${call.userId} model=${response.model} stop=${response.stop_reason} ` +
      `input_tokens=${response.usage.input_tokens} output_tokens=${response.usage.output_tokens} ` +
      `cache_read=${response.usage.cache_read_input_tokens ?? 0}` +
      (call.logExtra ? ` ${call.logExtra}` : ''),
  );

  if (response.stop_reason === 'refusal') {
    throw new UnprocessableEntityException(call.refusalMessage);
  }
  return response;
}

/** Concatenated text blocks of a reply. */
export function replyText(response: Anthropic.Message): string {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}
