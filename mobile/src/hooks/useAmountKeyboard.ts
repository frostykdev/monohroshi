import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";

export const OPERATOR_KEYS = ["+", "−", "×", "÷"] as const;
export type OperatorKey = (typeof OPERATOR_KEYS)[number];

const haptic = () => {
  Haptics.selectionAsync().catch(() => {});
};

export type UseAmountKeyboardOptions = {
  initialValue?: string;
  showSignToggle?: boolean;
  onChange?: (value: string) => void;
  onDone?: (value: string) => void;
};

export type UseAmountKeyboardReturn = {
  input: string;
  pendingOp: string | null;
  pendingValue: string;
  isNegative: boolean;
  displayStr: string;
  expressionStr: string;
  setIsNegative: (v: boolean) => void;
  handleKey: (key: string) => void;
  evaluate: () => number;
  reset: (value?: string, negative?: boolean) => void;
};

export const useAmountKeyboard = ({
  showSignToggle = true,
  onChange,
  onDone,
}: UseAmountKeyboardOptions = {}): UseAmountKeyboardReturn => {
  const [input, setInput] = useState("");
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState("");
  const [isNegative, setIsNegative] = useState(false);

  const evaluate = useCallback((): number => {
    const current = parseFloat(input) || 0;
    if (!pendingOp || !pendingValue) return current;
    const prev = parseFloat(pendingValue) || 0;
    switch (pendingOp) {
      case "+":
        return prev + current;
      case "−":
        return prev - current;
      case "×":
        return prev * current;
      case "÷":
        return current !== 0 ? prev / current : prev;
      default:
        return current;
    }
  }, [input, pendingOp, pendingValue]);

  const handleKey = useCallback(
    (key: string) => {
      haptic();
      if (key === "done") {
        const result = evaluate();
        const final = showSignToggle
          ? isNegative
            ? -Math.abs(result)
            : Math.abs(result)
          : result;
        const rounded = parseFloat(final.toFixed(10));
        const strValue = String(rounded === 0 ? 0 : rounded);
        onChange?.(strValue);
        onDone?.(strValue);
        return;
      }
      if (key === "=") {
        const result = evaluate();
        setInput(String(parseFloat(result.toFixed(10))));
        setPendingOp(null);
        setPendingValue("");
        return;
      }
      if (OPERATOR_KEYS.includes(key as OperatorKey)) {
        if (pendingOp && pendingValue && input) {
          const result = evaluate();
          setPendingValue(String(parseFloat(result.toFixed(10))));
        } else {
          const currentNum = parseFloat(input) || parseFloat(pendingValue) || 0;
          setPendingValue(String(currentNum));
        }
        setPendingOp(key);
        setInput("");
        return;
      }
      if (key === "⌫") {
        setInput((prev) => (prev.length <= 1 ? "" : prev.slice(0, -1)));
        return;
      }
      if (key === ",") {
        setInput((prev) => {
          if (prev.includes(".")) return prev;
          return (prev || "0") + ".";
        });
        return;
      }
      setInput((prev) => {
        if (prev === "0") return key === "0" ? "0" : key;
        const dotIdx = prev.indexOf(".");
        if (dotIdx !== -1 && prev.length - dotIdx > 2) return prev;
        return prev + key;
      });
    },
    [
      evaluate,
      input,
      pendingOp,
      pendingValue,
      isNegative,
      showSignToggle,
      onChange,
      onDone,
    ],
  );

  const reset = useCallback((value?: string, negative?: boolean) => {
    const num = parseFloat(value ?? "") || 0;
    setInput(num !== 0 ? String(Math.abs(num)) : "");
    setPendingOp(null);
    setPendingValue("");
    setIsNegative(negative ?? false);
  }, []);

  const displayValue = input || (pendingValue ? "..." : "0");
  const expressionStr = pendingOp ? `${pendingValue} ${pendingOp} ` : "";
  const displayStr = `${expressionStr}${displayValue}`;

  return {
    input,
    pendingOp,
    pendingValue,
    isNegative,
    displayStr,
    expressionStr,
    setIsNegative,
    handleKey,
    evaluate,
    reset,
  };
};
