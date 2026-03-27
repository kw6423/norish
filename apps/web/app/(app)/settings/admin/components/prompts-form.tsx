"use client";

import { useEffect, useState } from "react";
import { ArrowPathIcon, CheckIcon } from "@heroicons/react/16/solid";
import { Button, Spinner, Textarea } from "@heroui/react";
import { useTranslations } from "next-intl";

import { ServerConfigKeys } from "@norish/config/zod/server-config";

import { useAdminSettingsContext } from "../context";
import { TextareaWithVariables } from "./textarea-with-variables";

interface PromptsFormProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function PromptsForm({ onDirtyChange }: PromptsFormProps) {
  const t = useTranslations("settings.admin.promptsConfig");
  const tActions = useTranslations("common.actions");
  const { prompts, isLoading, updatePrompts, restoreDefaultConfig } = useAdminSettingsContext();

  const [recipeExtraction, setRecipeExtraction] = useState("");
  const [unitConversion, setUnitConversion] = useState("");
  const [nutritionEstimation, setNutritionEstimation] = useState("");
  const [autoTagging, setAutoTagging] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from context
  useEffect(() => {
    if (prompts) {
      setRecipeExtraction(prompts.recipeExtraction);
      setUnitConversion(prompts.unitConversion);
      setNutritionEstimation(prompts.nutritionEstimation);
      setAutoTagging(prompts.autoTagging);
    }
  }, [prompts]);

  // Track changes
  useEffect(() => {
    if (prompts) {
      const changed =
        recipeExtraction !== prompts.recipeExtraction ||
        unitConversion !== prompts.unitConversion ||
        nutritionEstimation !== prompts.nutritionEstimation ||
        autoTagging !== prompts.autoTagging;

      setHasChanges(changed);
    }
  }, [recipeExtraction, unitConversion, nutritionEstimation, autoTagging, prompts]);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const handleSave = async () => {
    setSaving(true);
    await updatePrompts({
      recipeExtraction,
      unitConversion,
      nutritionEstimation,
      autoTagging,
    }).finally(() => {
      setSaving(false);
    });
  };

  const handleRestoreDefaults = async () => {
    setRestoring(true);
    await restoreDefaultConfig(ServerConfigKeys.PROMPTS).finally(() => {
      setRestoring(false);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-2">
      <div className="flex flex-col gap-2">
        <Textarea
          description={t("recipeExtractionDescription")}
          label={t("recipeExtraction")}
          maxRows={15}
          minRows={6}
          placeholder={t("recipeExtractionPlaceholder")}
          value={recipeExtraction}
          onValueChange={setRecipeExtraction}
        />
      </div>

      <div className="flex flex-col gap-2">
        <TextareaWithVariables
          description={t("unitConversionDescription")}
          label={t("unitConversion")}
          maxRows={10}
          minRows={4}
          placeholder={t("unitConversionPlaceholder")}
          value={unitConversion}
          variables={[
            {
              key: "sourceSystem",
              description:
                'Inserts the recipe\'s current measurement system as a plain string: "metric" or "us". Example: "metric".',
            },
            {
              key: "targetSystem",
              description:
                'Inserts the destination measurement system as a plain string: "metric" or "us". Example: "us".',
            },
            {
              key: "units",
              description:
                'Inserts the allowed target-unit list. For targetSystem="metric": "g, ml, L, kg, C". For targetSystem="us": "cups, tbsp, tsp, oz, lb, F". Example: "cups, tbsp, tsp, oz, lb, F".',
            },
          ]}
          onValueChange={setUnitConversion}
        />
      </div>

      <div className="flex flex-col gap-2">
        <TextareaWithVariables
          description={t("nutritionEstimationDescription")}
          label={t("nutritionEstimation")}
          maxRows={15}
          minRows={6}
          placeholder={t("nutritionEstimationPlaceholder")}
          value={nutritionEstimation}
          variables={[
            {
              key: "recipeName",
              description:
                'Inserts the recipe name exactly as provided. Example: "Spaghetti Bolognese".',
            },
            {
              key: "servings",
              description: 'Inserts the serving count converted to a string. Example: "4".',
            },
            {
              key: "ingredients",
              description:
                'Inserts a newline-separated bullet list of ingredients in the format "- {amount?} {unit?} {ingredientName}". Examples: "- 2 cups flour", "- 1 tsp salt", "- eggs".',
            },
          ]}
          onValueChange={setNutritionEstimation}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          description={t("autoTaggingDescription")}
          label={t("autoTagging")}
          maxRows={15}
          minRows={6}
          placeholder={t("autoTaggingPlaceholder")}
          value={autoTagging}
          onValueChange={setAutoTagging}
        />
      </div>

      <div className="flex items-center justify-between">
        <Button
          color="warning"
          isLoading={restoring}
          startContent={!restoring && <ArrowPathIcon className="h-5 w-5" />}
          variant="flat"
          onPress={handleRestoreDefaults}
        >
          {tActions("restoreDefaults")}
        </Button>
        <Button
          color="primary"
          isDisabled={!hasChanges}
          isLoading={saving}
          startContent={<CheckIcon className="h-5 w-5" />}
          onPress={handleSave}
        >
          {tActions("save")}
        </Button>
      </div>
    </div>
  );
}
