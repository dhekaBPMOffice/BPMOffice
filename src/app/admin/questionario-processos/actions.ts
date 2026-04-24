"use server";

import {
  createForm,
  deleteForm,
  setActiveForm,
} from "@/lib/forms/admin-actions";

export async function createQuestionnaire(title: string, description: string) {
  return createForm({
    title,
    description,
    enableProcessLinking: true,
    isProcessActivationForm: true,
    isRequiredFirstAccess: true,
  });
}

export const setActiveQuestionnaire = setActiveForm;
export const deleteQuestionnaire = deleteForm;
