import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import type { ParseKeys } from "i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger";
export type ButtonSize = "md" | "sm";

type ButtonProps = Omit<PressableProps, "style"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  i18nKey?: ParseKeys;
  i18nValues?: Record<string, string | number>;
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  loading?: boolean;
  disabled?: boolean;
};

export const Button = ({
  variant = "primary",
  size = "md",
  i18nKey,
  i18nValues,
  children,
  style,
  loading = false,
  disabled = false,
  ...rest
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        s.base,
        s[variant],
        s[size],
        isDisabled && s.disabled,
        pressed && !isDisabled && s.pressed,
        style,
      ]}
      {...rest}
    >
      <View style={s.content}>
        <Typography
          variant={size === "sm" ? "buttonSmall" : "button"}
          color={labelColor[variant]}
          i18nKey={i18nKey}
          i18nValues={i18nValues}
        >
          {children}
        </Typography>
      </View>
    </Pressable>
  );
};

const labelColor: Record<
  ButtonVariant,
  React.ComponentProps<typeof Typography>["color"]
> = {
  primary: "textOnAccent",
  secondary: "textPrimary",
  ghost: "textSecondary",
  outline: "textPrimary",
  danger: "textOnAccent",
};

const s = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderCurve: "continuous",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,

  // Variants
  primary: {
    backgroundColor: colors.accent,
  } as ViewStyle,
  secondary: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  ghost: {
    backgroundColor: colors.transparent,
  } as ViewStyle,
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  } as ViewStyle,
  danger: {
    backgroundColor: colors.error,
  } as ViewStyle,

  // Sizes
  md: {
    height: 58,
    paddingHorizontal: 24,
  } as ViewStyle,
  sm: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
  } as ViewStyle,

  // States
  pressed: {
    opacity: 0.8,
  } as ViewStyle,
  disabled: {
    opacity: 0.4,
  } as ViewStyle,
});
