"use client";

import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useState } from "react";

type TextInputElement = HTMLInputElement | HTMLTextAreaElement;

interface AutocompletePosition {
  left: number;
  top: number;
}

interface UseTextInputAutocompletePositionOptions {
  containerRef: RefObject<HTMLElement | null>;
  inputRef: RefObject<TextInputElement | null>;
  isOpen: boolean;
  value: string;
  dropdownWidth?: number;
  padding?: number;
  offsetY?: number;
}

function getTextInputCaretPosition(input: TextInputElement, selectionStart: number) {
  const computedStyle = window.getComputedStyle(input);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = input instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflowWrap = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "0";

  const mirroredProperties = [
    "boxSizing",
    "width",
    "height",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "letterSpacing",
    "textTransform",
    "textIndent",
    "textDecoration",
    "textAlign",
    "tabSize",
  ] as const;

  mirroredProperties.forEach((property) => {
    mirror.style[property] = computedStyle[property];
  });

  mirror.textContent = input.value.slice(0, selectionStart);
  marker.textContent = input.value.slice(selectionStart, selectionStart + 1) || "\u200b";

  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const caretOffset = {
    left: marker.offsetLeft - input.scrollLeft,
    top: marker.offsetTop - input.scrollTop,
    height: marker.offsetHeight || parseFloat(computedStyle.lineHeight) || 20,
  };

  document.body.removeChild(mirror);

  return caretOffset;
}

export function useTextInputAutocompletePosition({
  containerRef,
  inputRef,
  isOpen,
  value,
  dropdownWidth = 280,
  padding = 12,
  offsetY = 12,
}: UseTextInputAutocompletePositionOptions) {
  const [position, setPosition] = useState<AutocompletePosition>({ left: padding, top: padding });

  const updatePosition = useCallback(() => {
    const input = inputRef.current;
    const container = containerRef.current;

    if (!isOpen || !input || !container) return;

    const selectionStart = input.selectionStart ?? value.length;
    const caret = getTextInputCaretPosition(input, selectionStart);
    const inputRect = input.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const inputOffsetLeft = inputRect.left - containerRect.left;
    const inputOffsetTop = inputRect.top - containerRect.top;
    const left = Math.min(
      Math.max(inputOffsetLeft + caret.left, padding),
      Math.max(inputOffsetLeft + input.clientWidth - dropdownWidth - padding, padding)
    );
    const top = Math.max(inputOffsetTop + caret.top + caret.height + offsetY, padding);

    setPosition({ left, top });
  }, [containerRef, dropdownWidth, inputRef, isOpen, offsetY, padding, value]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const input = inputRef.current;

    if (!input) return;

    const handleUpdate = () => updatePosition();

    input.addEventListener("scroll", handleUpdate);
    window.addEventListener("resize", handleUpdate);

    return () => {
      input.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [inputRef, isOpen, updatePosition]);

  return position;
}

export type { AutocompletePosition, UseTextInputAutocompletePositionOptions };
