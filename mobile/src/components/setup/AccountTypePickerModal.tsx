import { forwardRef, useCallback } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { ACCOUNT_TYPES, AccountTypeConfig } from "@constants/account-types";
import { Typography } from "@components/ui/Typography";

type Props = {
  selectedType: string;
  onSelect: (type: string) => void;
};

export const AccountTypePickerModal = forwardRef<BottomSheetModal, Props>(
  ({ selectedType, onSelect }, ref) => {
    const { t } = useTranslation();
    const { top } = useSafeAreaInsets();

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
        />
      ),
      [],
    );

    const renderItem = useCallback(
      ({ item }: { item: AccountTypeConfig }) => {
        const isSelected = item.type === selectedType;

        return (
          <Pressable
            style={({ pressed }) => [
              s.item,
              pressed && s.itemPressed,
              isSelected && s.itemSelected,
            ]}
            onPress={() => onSelect(item.type)}
          >
            <View
              style={[s.iconCircle, { backgroundColor: `${item.color}20` }]}
            >
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Typography variant="label" color="textPrimary" style={s.itemLabel}>
              {t(`onboarding.accountSetup.types.${item.type}` as never)}
            </Typography>
            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.accent}
              />
            )}
          </Pressable>
        );
      },
      [selectedType, onSelect, t],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={["92%"]}
        topInset={top}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBackground}
        handleIndicatorStyle={s.handle}
      >
        <View style={s.header}>
          <Typography
            variant="h3"
            i18nKey="onboarding.accountSetup.selectType"
          />
        </View>
        <BottomSheetFlatList<AccountTypeConfig>
          data={ACCOUNT_TYPES}
          keyExtractor={(item: AccountTypeConfig) => item.type}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
        />
      </BottomSheetModal>
    );
  },
);

AccountTypePickerModal.displayName = "AccountTypePickerModal";

const s = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  handle: {
    backgroundColor: colors.border,
    width: 36,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  } as ViewStyle,
  listContent: {
    paddingBottom: 40,
  } as ViewStyle,
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  } as ViewStyle,
  itemPressed: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  itemSelected: {
    backgroundColor: `${colors.accent}18`,
  } as ViewStyle,
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  itemLabel: {
    flex: 1,
  },
});
