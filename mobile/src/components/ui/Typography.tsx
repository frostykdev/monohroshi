import { StyleSheet, Text, TextProps, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import type { ParseKeys } from "i18next";
import { colors, AppColor } from "@constants/colors";

export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySmall"
  | "label"
  | "caption"
  | "button"
  | "buttonSmall";

type TypographyProps = Omit<TextProps, "style"> & {
  variant?: TypographyVariant;
  color?: AppColor;
  i18nKey?: ParseKeys;
  i18nValues?: Record<string, string | number>;
  style?: TextStyle | TextStyle[];
  align?: "left" | "center" | "right";
  children?: React.ReactNode;
};

export const Typography = ({
  variant = "body",
  color = "textPrimary",
  align = "left",
  i18nKey,
  i18nValues,
  style,
  children,
  ...rest
}: TypographyProps) => {
  const { t } = useTranslation();

  const content = i18nKey ? t(i18nKey as never, i18nValues) : children;

  const textStyle = {
    ...s.base,
    ...s[variant],
    color: colors[color],
    ...(align && { textAlign: align }),
    ...style,
  };

  return (
    <Text style={textStyle} {...rest}>
      {content}
    </Text>
  );
};

const s = StyleSheet.create({
  base: {
    includeFontPadding: false,
  } as TextStyle,
  h1: {
    fontSize: 38,
    fontWeight: "700",
    lineHeight: 44,
    letterSpacing: -0.5,
  } as TextStyle,
  h2: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    letterSpacing: -0.3,
  } as TextStyle,
  h3: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  } as TextStyle,
  bodySmall: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  } as TextStyle,
  label: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
    letterSpacing: 0.2,
  } as TextStyle,
  button: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  } as TextStyle,
  buttonSmall: {
    fontSize: 16,
    fontWeight: "500",
  } as TextStyle,
});
