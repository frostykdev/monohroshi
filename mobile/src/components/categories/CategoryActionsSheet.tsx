import { forwardRef, useCallback } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

export type CategoryActionsSheetItem = {
  id: string;
  name: string;
  icon: string | null;
  type: "expense" | "income";
  isSystem?: boolean;
  localId?: string;
};

type Props = {
  item: CategoryActionsSheetItem | null;
  workspaceId?: string | null;
  showTransactions?: boolean;
  onEdit: (item: CategoryActionsSheetItem) => void;
  onDelete: (item: CategoryActionsSheetItem) => void;
  onShowTransactions?: (item: CategoryActionsSheetItem) => void;
};

export const CategoryActionsSheet = forwardRef<BottomSheetModal, Props>(
  (
    { item, showTransactions = true, onEdit, onDelete, onShowTransactions },
    ref,
  ) => {
    const { t } = useTranslation();
    const { bottom } = useSafeAreaInsets();

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

    const dismiss = () => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    };

    const handleEdit = () => {
      dismiss();
      if (item) onEdit(item);
    };

    const handleShowTransactions = () => {
      dismiss();
      if (item && onShowTransactions) onShowTransactions(item);
    };

    const handleDelete = () => {
      dismiss();
      if (item) onDelete(item);
    };

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBackground}
        handleIndicatorStyle={s.handle}
      >
        <BottomSheetView
          style={[s.content, { paddingBottom: Math.max(bottom, 24) + 8 }]}
        >
          {item && (
            <View style={s.itemHeader}>
              <View style={s.itemIcon}>
                <Ionicons
                  name={
                    (item.icon ?? "pricetag-outline") as React.ComponentProps<
                      typeof Ionicons
                    >["name"]
                  }
                  size={20}
                  color={colors.textPrimary}
                />
              </View>
              <Typography variant="label">{item.name}</Typography>
            </View>
          )}

          <View style={s.divider} />

          {!item?.isSystem && (
            <Pressable
              style={({ pressed }) => [s.option, pressed && s.pressed]}
              onPress={handleEdit}
            >
              <Ionicons
                name="pencil-outline"
                size={20}
                color={colors.textPrimary}
              />
              <Typography variant="body">
                {t("categories.actions.edit")}
              </Typography>
            </Pressable>
          )}

          {showTransactions && (
            <Pressable
              style={({ pressed }) => [s.option, pressed && s.pressed]}
              onPress={handleShowTransactions}
            >
              <Ionicons
                name="list-outline"
                size={20}
                color={colors.textPrimary}
              />
              <Typography variant="body">
                {t("categories.actions.showTransactions")}
              </Typography>
            </Pressable>
          )}

          {!item?.isSystem && (
            <Pressable
              style={({ pressed }) => [s.option, pressed && s.pressed]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Typography variant="body" color="error">
                {t("categories.actions.delete")}
              </Typography>
            </Pressable>
          )}

          {item?.isSystem && (
            <View style={s.systemNote}>
              <Ionicons
                name="lock-closed-outline"
                size={14}
                color={colors.textTertiary}
              />
              <Typography variant="caption" color="textTertiary">
                {t("onboarding.categoriesSetup.systemCategoryNote")}
              </Typography>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

CategoryActionsSheet.displayName = "CategoryActionsSheet";

const s = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  handle: {
    backgroundColor: colors.border,
    width: 36,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 4,
  } as ViewStyle,
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  } as ViewStyle,
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: 4,
  } as ViewStyle,
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
  systemNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  } as ViewStyle,
});
