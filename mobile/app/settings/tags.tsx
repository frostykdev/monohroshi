import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useCallback, useRef, useState, forwardRef } from "react";
import {
  useSafeAreaInsets,
  useSafeAreaInsets as _useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useDeleteTag, useTags } from "@services/tags/tags.queries";
import type { Tag } from "@services/tags/tags.api";

const TagsScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);

  const { data: tags = [], isLoading } = useTags(activeWorkspaceId);
  const { mutate: deleteTag } = useDeleteTag(activeWorkspaceId);

  const [selectedItem, setSelectedItem] = useState<Tag | null>(null);
  const actionsSheetRef = useRef<BottomSheetModal>(null);

  const haptic = () => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
  };

  const handleOpenActions = (item: Tag) => {
    haptic();
    setSelectedItem(item);
    actionsSheetRef.current?.present();
  };

  const handleEdit = useCallback(
    (item: Tag) => {
      router.push(
        `/(modals)/add-tag?mode=edit&tagId=${item.id}&initialName=${encodeURIComponent(item.name)}&initialColor=${encodeURIComponent(item.color ?? "")}&workspaceId=${activeWorkspaceId ?? ""}` as never,
      );
    },
    [activeWorkspaceId],
  );

  const handleDelete = useCallback(
    (item: Tag) => {
      Alert.alert(
        t("tags.deleteConfirmTitle"),
        t("tags.deleteConfirmMessage", { name: item.name }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () => {
              haptic();
              deleteTag(item.id, {
                onError: () =>
                  Alert.alert(
                    t("tags.deleteConfirmTitle"),
                    t("tags.errors.deleteFailed"),
                  ),
              });
            },
          },
        ],
      );
    },
    [deleteTag, t],
  );

  const renderItem = ({ item }: { item: Tag }) => (
    <Pressable style={s.tagRow}>
      <View
        style={[
          s.tagDot,
          { backgroundColor: item.color ?? colors.textTertiary },
        ]}
      />
      <Typography variant="body" color="textPrimary" style={s.tagName}>
        {item.name}
      </Typography>
      <Pressable
        onPress={() => handleOpenActions(item)}
        hitSlop={8}
        style={({ pressed }) => pressed && s.pressed}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={colors.textTertiary}
        />
      </Pressable>
    </Pressable>
  );

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScreenHeader
        title={t("tags.title")}
        left={
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        }
        onLeftPress={() => router.back()}
        right={<Ionicons name="add" size={26} color={colors.textPrimary} />}
        onRightPress={() => {
          haptic();
          router.push(
            `/(modals)/add-tag?workspaceId=${activeWorkspaceId ?? ""}` as never,
          );
        }}
      />

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : tags.length === 0 ? (
        <View style={s.empty}>
          <Ionicons
            name="pricetag-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Typography
            variant="body"
            color="textSecondary"
            style={s.emptyText}
            i18nKey="tags.empty"
          />
        </View>
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TagActionsSheet
        ref={actionsSheetRef}
        item={selectedItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </View>
  );
};

type TagActionsSheetProps = {
  item: Tag | null;
  onEdit: (item: Tag) => void;
  onDelete: (item: Tag) => void;
};

const TagActionsSheet = forwardRef<BottomSheetModal, TagActionsSheetProps>(
  ({ item, onEdit, onDelete }, ref) => {
    const { t } = useTranslation();
    const { bottom } = _useSafeAreaInsets();

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

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={as.sheetBg}
        handleIndicatorStyle={as.handle}
      >
        <BottomSheetView
          style={[as.content, { paddingBottom: Math.max(bottom, 24) + 8 }]}
        >
          <Pressable
            style={({ pressed }) => [as.option, pressed && as.pressed]}
            onPress={() => {
              dismiss();
              if (item) onEdit(item);
            }}
          >
            <Ionicons
              name="pencil-outline"
              size={20}
              color={colors.textPrimary}
            />
            <Typography variant="body">{t("tags.actions.edit")}</Typography>
          </Pressable>

          <Pressable
            style={({ pressed }) => [as.option, pressed && as.pressed]}
            onPress={() => {
              dismiss();
              if (item) onDelete(item);
            }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Typography variant="body" color="error">
              {t("tags.actions.delete")}
            </Typography>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

TagActionsSheet.displayName = "TagActionsSheet";

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  } as ViewStyle,
  emptyText: {
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  } as ViewStyle,
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  } as ViewStyle,
  tagDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  } as ViewStyle,
  tagName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

const as = StyleSheet.create({
  sheetBg: {
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
});

export default TagsScreen;
