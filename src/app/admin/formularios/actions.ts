"use server";

import {
  addOption as addOptionAction,
  addQuestion as addQuestionAction,
  addSection as addSectionAction,
  createForm as createFormAction,
  deleteForm as deleteFormAction,
  deleteOption as deleteOptionAction,
  deleteQuestion as deleteQuestionAction,
  deleteSection as deleteSectionAction,
  duplicateQuestion as duplicateQuestionAction,
  reorderQuestions as reorderQuestionsAction,
  reorderSections as reorderSectionsAction,
  setActiveForm as setActiveFormAction,
  updateForm as updateFormAction,
  updateOption as updateOptionAction,
  updateQuestion as updateQuestionAction,
  updateSection as updateSectionAction,
} from "@/lib/forms/admin-actions";

export async function createForm(
  ...args: Parameters<typeof createFormAction>
): Promise<Awaited<ReturnType<typeof createFormAction>>> {
  return createFormAction(...args);
}

export async function setActiveForm(
  ...args: Parameters<typeof setActiveFormAction>
): Promise<Awaited<ReturnType<typeof setActiveFormAction>>> {
  return setActiveFormAction(...args);
}

export async function deleteForm(
  ...args: Parameters<typeof deleteFormAction>
): Promise<Awaited<ReturnType<typeof deleteFormAction>>> {
  return deleteFormAction(...args);
}

export async function addSection(
  ...args: Parameters<typeof addSectionAction>
): Promise<Awaited<ReturnType<typeof addSectionAction>>> {
  return addSectionAction(...args);
}

export async function updateSection(
  ...args: Parameters<typeof updateSectionAction>
): Promise<Awaited<ReturnType<typeof updateSectionAction>>> {
  return updateSectionAction(...args);
}

export async function deleteSection(
  ...args: Parameters<typeof deleteSectionAction>
): Promise<Awaited<ReturnType<typeof deleteSectionAction>>> {
  return deleteSectionAction(...args);
}

export async function reorderSections(
  ...args: Parameters<typeof reorderSectionsAction>
): Promise<Awaited<ReturnType<typeof reorderSectionsAction>>> {
  return reorderSectionsAction(...args);
}

export async function updateForm(
  ...args: Parameters<typeof updateFormAction>
): Promise<Awaited<ReturnType<typeof updateFormAction>>> {
  return updateFormAction(...args);
}

export async function addQuestion(
  ...args: Parameters<typeof addQuestionAction>
): Promise<Awaited<ReturnType<typeof addQuestionAction>>> {
  return addQuestionAction(...args);
}

export async function updateQuestion(
  ...args: Parameters<typeof updateQuestionAction>
): Promise<Awaited<ReturnType<typeof updateQuestionAction>>> {
  return updateQuestionAction(...args);
}

export async function deleteQuestion(
  ...args: Parameters<typeof deleteQuestionAction>
): Promise<Awaited<ReturnType<typeof deleteQuestionAction>>> {
  return deleteQuestionAction(...args);
}

export async function reorderQuestions(
  ...args: Parameters<typeof reorderQuestionsAction>
): Promise<Awaited<ReturnType<typeof reorderQuestionsAction>>> {
  return reorderQuestionsAction(...args);
}

export async function duplicateQuestion(
  ...args: Parameters<typeof duplicateQuestionAction>
): Promise<Awaited<ReturnType<typeof duplicateQuestionAction>>> {
  return duplicateQuestionAction(...args);
}

export async function addOption(
  ...args: Parameters<typeof addOptionAction>
): Promise<Awaited<ReturnType<typeof addOptionAction>>> {
  return addOptionAction(...args);
}

export async function updateOption(
  ...args: Parameters<typeof updateOptionAction>
): Promise<Awaited<ReturnType<typeof updateOptionAction>>> {
  return updateOptionAction(...args);
}

export async function deleteOption(
  ...args: Parameters<typeof deleteOptionAction>
): Promise<Awaited<ReturnType<typeof deleteOptionAction>>> {
  return deleteOptionAction(...args);
}
