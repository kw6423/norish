"use client";

import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TextInputElement = HTMLInputElement | HTMLTextAreaElement;

interface InsertOptionArgs<T> {
  option: T;
  value: string;
  query: string;
  trigger: string;
  triggerSuffix: string;
  triggerStart: number;
  cursorPosition: number;
}

interface TextTriggerMatch {
  query: string;
  triggerStart: number;
  cursorPosition: number;
}

interface UseTextTriggerAutocompleteOptions<T> {
  value: string;
  options: T[];
  trigger: string;
  onValueChange: (value: string) => void;
  getOptionKey: (option: T) => string;
  getOptionLabel: (option: T) => string;
  getOptionCompletion?: (option: T) => string;
  filterOption?: (option: T, query: string) => boolean;
  insertOption?: (args: InsertOptionArgs<T>) => { value: string; cursorPosition: number };
  triggerSuffix?: string;
  minQueryLength?: number;
  maxOptions?: number;
  closeOnBlurDelayMs?: number;
}

interface UseTextTriggerAutocompleteResult<T> {
  containerRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<TextInputElement | null>;
  filteredOptions: T[];
  highlightedIndex: number;
  isOpen: boolean;
  query: string;
  close: () => void;
  handleBlur: () => void;
  handleInputChange: (nextValue: string) => void;
  handleKeyDown: (event: KeyboardEvent<TextInputElement>) => void;
  handleSelect: (option: T) => void;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
}

function getTriggerMatch(
  value: string,
  cursorPosition: number,
  trigger: string,
  triggerSuffix: string
): TextTriggerMatch | null {
  if (!trigger) return null;

  const textBeforeCursor = value.slice(0, cursorPosition);
  const triggerStart = textBeforeCursor.lastIndexOf(trigger);

  if (triggerStart === -1) return null;

  const query = textBeforeCursor.slice(triggerStart + trigger.length);

  if (query.includes("\n")) return null;

  if (triggerSuffix) {
    const suffixIndex = query.indexOf(triggerSuffix);

    if (suffixIndex !== -1) {
      return null;
    }
  }

  return {
    query,
    triggerStart,
    cursorPosition,
  };
}

export function useTextTriggerAutocomplete<T>({
  value,
  options,
  trigger,
  onValueChange,
  getOptionKey,
  getOptionLabel,
  getOptionCompletion = getOptionLabel,
  filterOption,
  insertOption,
  triggerSuffix = "",
  minQueryLength = 0,
  maxOptions,
  closeOnBlurDelayMs = 200,
}: UseTextTriggerAutocompleteOptions<T>): UseTextTriggerAutocompleteResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<TextInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [activeMatch, setActiveMatch] = useState<TextTriggerMatch | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(0);
    setActiveMatch(null);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = options.filter((option) => {
      if (filterOption) {
        return filterOption(option, query);
      }

      return getOptionLabel(option).toLowerCase().includes(normalizedQuery);
    });

    return typeof maxOptions === "number" ? matches.slice(0, maxOptions) : matches;
  }, [filterOption, getOptionLabel, maxOptions, options, query]);

  const updateAutocompleteState = useCallback(
    (nextValue: string, cursorPosition: number) => {
      const match = getTriggerMatch(nextValue, cursorPosition, trigger, triggerSuffix);

      if (!match || match.query.length < minQueryLength) {
        close();

        return;
      }

      setActiveMatch(match);
      setQuery(match.query);
      setIsOpen(true);
      setHighlightedIndex(0);
    },
    [close, minQueryLength, trigger, triggerSuffix]
  );

  const handleInputChange = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue);

      const cursorPosition = inputRef.current?.selectionStart ?? nextValue.length;

      updateAutocompleteState(nextValue, cursorPosition);
    },
    [onValueChange, updateAutocompleteState]
  );

  const handleSelect = useCallback(
    (option: T) => {
      if (!activeMatch) return;

      const result = insertOption
        ? insertOption({
            option,
            value,
            query: activeMatch.query,
            trigger,
            triggerSuffix,
            triggerStart: activeMatch.triggerStart,
            cursorPosition: activeMatch.cursorPosition,
          })
        : (() => {
            const completion = getOptionCompletion(option);
            const replacement = `${trigger}${completion}${triggerSuffix}`;
            const before = value.slice(0, activeMatch.triggerStart);
            const afterStart = activeMatch.cursorPosition;
            const hasSuffixAhead =
              triggerSuffix.length > 0 && value.slice(afterStart).startsWith(triggerSuffix);
            const after = value.slice(afterStart + (hasSuffixAhead ? triggerSuffix.length : 0));
            const nextValue = `${before}${replacement}${after}`;

            return {
              value: nextValue,
              cursorPosition: before.length + replacement.length,
            };
          })();

      onValueChange(result.value);
      close();

      requestAnimationFrame(() => {
        if (!inputRef.current) return;

        inputRef.current.focus();
        inputRef.current.setSelectionRange(result.cursorPosition, result.cursorPosition);
      });
    },
    [
      activeMatch,
      close,
      getOptionCompletion,
      insertOption,
      onValueChange,
      trigger,
      triggerSuffix,
      value,
    ]
  );

  const handleBlur = useCallback(() => {
    window.setTimeout(() => close(), closeOnBlurDelayMs);
  }, [close, closeOnBlurDelayMs]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<TextInputElement>) => {
      if (!isOpen || filteredOptions.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((current) => (current + 1) % filteredOptions.length);

        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((current) =>
          current === 0 ? filteredOptions.length - 1 : current - 1
        );

        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        const option = filteredOptions[highlightedIndex];

        if (!option) return;

        event.preventDefault();
        handleSelect(option);

        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    },
    [close, filteredOptions, handleSelect, highlightedIndex, isOpen]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < filteredOptions.length) return;

    setHighlightedIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : 0);
  }, [filteredOptions.length, highlightedIndex, isOpen]);

  return {
    containerRef,
    inputRef,
    filteredOptions,
    highlightedIndex,
    isOpen,
    query,
    close,
    handleBlur,
    handleInputChange,
    handleKeyDown,
    handleSelect,
    setHighlightedIndex,
  };
}

export type {
  InsertOptionArgs,
  TextTriggerMatch,
  UseTextTriggerAutocompleteOptions,
  UseTextTriggerAutocompleteResult,
};
