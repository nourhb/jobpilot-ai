import type { QuestionAnswerResult } from "@jobpilot/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface CreateApplicationAnswerInput {
  applicationId: string;
  questionText: string;
  result: QuestionAnswerResult;
}

function toRow(input: CreateApplicationAnswerInput): Prisma.ApplicationAnswerCreateManyInput {
  return {
    applicationId: input.applicationId,
    questionText: input.questionText,
    category: input.result.category,
    status: input.result.status,
    answer: input.result.answer,
    source: input.result.source,
    blockedReason: input.result.blockedReason,
    factCheckValid: input.result.factCheck?.valid ?? null,
    factCheckConfidence: input.result.factCheck?.confidence ?? null,
    factCheckUnsupported: input.result.factCheck?.unsupportedClaims ?? [],
    aiModel: input.result.aiModel,
    aiPromptVersion: input.result.aiPromptVersion,
  };
}

export const applicationAnswerRepository = {
  /** Every attempt (including a retry) fully replaces the previous answer set -- stale answers from an earlier attempt must never linger alongside new ones. */
  async replaceAll(applicationId: string, inputs: CreateApplicationAnswerInput[]) {
    await prisma.applicationAnswer.deleteMany({ where: { applicationId } });
    if (inputs.length === 0) return;
    await prisma.applicationAnswer.createMany({ data: inputs.map(toRow) });
  },

  listByApplicationId(applicationId: string) {
    return prisma.applicationAnswer.findMany({ where: { applicationId }, orderBy: { createdAt: "asc" } });
  },
};
