import { z } from 'zod';

export const exampleMetadataSchema = z.object({
    duration: z.number().optional(),
    model: z.string().optional(),
    totalTokens: z.number().optional(),
  });

  export type ExampleMetadata = z.infer<typeof exampleMetadataSchema>;
