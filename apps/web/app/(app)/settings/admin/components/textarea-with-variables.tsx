"use client";

import type { ComponentProps, ReactNode, Ref } from "react";
import { useTextInputAutocompletePosition } from "@/hooks/use-text-input-autocomplete-position";
import { useTextTriggerAutocomplete } from "@/hooks/use-text-trigger-autocomplete";
import { Listbox, ListboxItem, Textarea } from "@heroui/react";

interface TextareaVariable {
  key: string;
  description?: ReactNode;
}

interface TextareaWithVariablesProps extends Omit<
  ComponentProps<typeof Textarea>,
  "value" | "onValueChange"
> {
  value: string;
  onValueChange: (value: string) => void;
  variables: TextareaVariable[];
}

export function TextareaWithVariables({
  value,
  onValueChange,
  variables,
  ...textareaProps
}: TextareaWithVariablesProps) {
  const autocomplete = useTextTriggerAutocomplete({
    value,
    onValueChange,
    options: variables,
    trigger: "{{",
    triggerSuffix: "}}",
    minQueryLength: 0,
    getOptionKey: (option) => option.key,
    getOptionLabel: (option) => option.key,
    filterOption: (option, query) => option.key.toLowerCase().includes(query.trim().toLowerCase()),
    insertOption: ({ option, value, triggerStart, cursorPosition }) => {
      const token = option.key;
      const before = value.slice(0, triggerStart);
      const after = value.slice(cursorPosition);
      const nextValue = `${before}{{${token}}}${after}`;

      return {
        value: nextValue,
        cursorPosition: before.length + token.length + 4,
      };
    },
  });
  const position = useTextInputAutocompletePosition({
    containerRef: autocomplete.containerRef,
    inputRef: autocomplete.inputRef,
    isOpen: autocomplete.isOpen,
    value,
    dropdownWidth: 280,
    offsetY: 5,
  });

  return (
    <div ref={autocomplete.containerRef} className="relative">
      <Textarea
        {...textareaProps}
        ref={autocomplete.inputRef as Ref<HTMLTextAreaElement>}
        value={value}
        onBlur={autocomplete.handleBlur}
        onKeyDown={autocomplete.handleKeyDown}
        onValueChange={autocomplete.handleInputChange}
      />

      {autocomplete.isOpen && autocomplete.filteredOptions.length > 0 ? (
        <div
          className="bg-content1 border-default-200 absolute z-50 max-h-56 w-70 overflow-auto rounded-lg border shadow-xl"
          style={{
            left: `${position.left}px`,
            top: `${position.top}px`,
          }}
        >
          <Listbox
            aria-label="Variables"
            items={autocomplete.filteredOptions}
            onAction={(key) => {
              const option = autocomplete.filteredOptions.find((item) => item.key === key);

              if (option) autocomplete.handleSelect(option);
            }}
          >
            {(option) => {
              const token = option.key;

              return (
                <ListboxItem
                  key={option.key}
                  className="px-3 py-2"
                  textValue={token}
                  onMouseEnter={() => {
                    const index = autocomplete.filteredOptions.findIndex(
                      (item) => item.key === option.key
                    );

                    autocomplete.setHighlightedIndex(index);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{`{{${token}}}`}</span>
                    {option.description ? (
                      <span className="text-default-500 text-[11px]">{option.description}</span>
                    ) : null}
                  </div>
                </ListboxItem>
              );
            }}
          </Listbox>
        </div>
      ) : null}
    </div>
  );
}
