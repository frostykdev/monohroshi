import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { DATE_PRESETS, type DatePreset } from "@utils/date-presets";

type Props = {
  selected: DatePreset | null;
  onSelect: (preset: DatePreset | null) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  /** When true, an "All time" (null) option is prepended to the list. Default false. */
  allowNull?: boolean;
};

export const DatePickerSheet = ({
  selected,
  onSelect,
  sheetRef,
  allowNull = false,
}: Props) => {
  const { t } = useTranslation();
  const presets: (DatePreset | null)[] = allowNull
    ? [null, ...DATE_PRESETS]
    : DATE_PRESETS;

  return (
    <BottomSheetView>
      {presets.map((preset, i) => {
        const isActive = preset === selected;
        return (
          <Pressable
            key={preset ?? "all"}
            style={({ pressed }) => [
              s.row,
              i < presets.length - 1 && s.divider,
              pressed && s.pressed,
            ]}
            onPress={() => {
              onSelect(preset);
              sheetRef.current?.dismiss();
            }}
          >
            <Typography
              variant="body"
              color={isActive ? "textPrimary" : "textSecondary"}
              style={isActive ? s.activeLabel : undefined}
            >
              {preset === null
                ? t("analytics.datePresets.allTime")
                : t(`analytics.datePresets.${preset}`)}
            </Typography>
            {isActive && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.accent}
              />
            )}
          </Pressable>
        );
      })}
      <View style={s.bottomPad} />
    </BottomSheetView>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 16,
  } as ViewStyle,
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
  activeLabel: { fontWeight: "600" },
  bottomPad: { height: 32 } as ViewStyle,
});
