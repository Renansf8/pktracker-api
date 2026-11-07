import { z } from 'zod';
import { toStructuredOutputSchema } from './genui.schema';

/**
 * What the model returns. Numbers never appear in the text: they are
 * `{fN}` (value) or `{fN.label}` (label) markers pointing at the facts the
 * server sent, which renderCommentary checks and replaces.
 */
export const CommentarySchema = z.object({
  headline: z
    .string()
    .describe(
      'Uma frase em português, com marcadores {fN} no lugar dos números',
    ),
  insights: z.array(
    z.object({
      text: z.string().describe('Uma frase em português, sem dígitos'),
      widgets: z
        .array(z.number())
        .describe('Índices (w0, w1…) dos widgets a que a frase se refere'),
    }),
  ),
  caveat: z
    .string()
    .nullable()
    .describe(
      'Aviso curto sobre amostra pequena ou moedas somadas; null se não precisar',
    ),
});

export type CommentaryOutput = z.infer<typeof CommentarySchema>;

export const COMMENTARY_JSON_SCHEMA = toStructuredOutputSchema(
  z.toJSONSchema(CommentarySchema, { reused: 'inline', io: 'output' }),
);
