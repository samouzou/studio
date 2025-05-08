'use server';
/**
 * @fileOverview Extracts contract details (brand, amount, due date) from contract documents using an LLM.
 *
 * - extractContractDetails - A function that handles the contract detail extraction process.
 * - ExtractContractDetailsInput - The input type for the extractContractDetails function.
 * - ExtractContractDetailsOutput - The return type for the extractContractDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractContractDetailsInputSchema = z.object({
  contractText: z.string().describe('The text content of the contract document.'),
});
export type ExtractContractDetailsInput = z.infer<typeof ExtractContractDetailsInputSchema>;

const ExtractContractDetailsOutputSchema = z.object({
  brand: z.string().describe('The brand or counterparty name in the contract.'),
  amount: z.number().describe('The payment amount specified in the contract.'),
  dueDate: z.string().describe('The payment due date in ISO 8601 format (YYYY-MM-DD).'),
});
export type ExtractContractDetailsOutput = z.infer<typeof ExtractContractDetailsOutputSchema>;

export async function extractContractDetails(input: ExtractContractDetailsInput): Promise<ExtractContractDetailsOutput> {
  return extractContractDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractContractDetailsPrompt',
  input: {schema: ExtractContractDetailsInputSchema},
  output: {schema: ExtractContractDetailsOutputSchema},
  prompt: `You are an expert contract analyst. Your task is to extract key details from the provided contract text.

  Specifically, extract the following information:
  - brand: The name of the brand or counterparty involved in the contract.
  - amount: The payment amount specified in the contract (as a number).
  - dueDate: The payment due date in ISO 8601 format (YYYY-MM-DD).

  Ensure that the extracted information is accurate and follows the specified format.

  Contract Text: {{{contractText}}}
  `,
});

const extractContractDetailsFlow = ai.defineFlow(
  {
    name: 'extractContractDetailsFlow',
    inputSchema: ExtractContractDetailsInputSchema,
    outputSchema: ExtractContractDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
