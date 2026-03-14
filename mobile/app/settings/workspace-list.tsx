import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { Typography } from "@components/ui/Typography";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useAllWorkspaces } from "@services/workspaces/workspaces.queries";
import type { WorkspaceSummary } from "@services/workspaces/workspaces.api";

const ICON_COLORS = [
  colors.iconBlue,
  colors.iconPurple,
  colors.iconTeal,
  colors.warning,
  colors.success,
];

const WorkspaceListScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const activeId = useWorkspaceStore((s) => s.id);
  const cachedWorkspaces = useWorkspaceStore((s) => s.workspaces);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);

  const { data, isLoading } = useAllWorkspaces();

  useEffect(() => {
    if (data) {
      setWorkspaces(data);
    }
  }, [data, setWorkspaces]);

  const workspaces = data ?? cachedWorkspaces;

  if (isLoading && workspaces.length === 0) {
    return (
      <View
        style={[
          s.container,
          s.centered,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const openDetails = (workspaceId: string) => {
    router.push(`/settings/workspace-details?id=${workspaceId}` as never);
  };

  const selectActive = (workspace: WorkspaceSummary) => {
    setWorkspace(workspace.id, workspace.name);
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScreenHeader
        title={t("workspace.list.title")}
        left={
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        }
        onLeftPress={() => router.back()}
      />

      <ScrollView
        style={s.flex}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          {workspaces.map((workspace, index) => {
            const isActive = workspace.id === activeId;
            const iconColor = ICON_COLORS[index % ICON_COLORS.length];
            const initial = workspace.name.charAt(0).toUpperCase();
            const isLast = index === workspaces.length - 1;

            return (
              <Pressable
                key={workspace.id}
                style={({ pressed }) => [
                  s.row,
                  !isLast && s.rowDivider,
                  pressed && s.pressed,
                ]}
                onPress={() => selectActive(workspace)}
              >
                <View style={[s.iconCircle, { backgroundColor: iconColor }]}>
                  <Typography variant="label" color="textOnAccent">
                    {initial}
                  </Typography>
                </View>

                <View style={s.rowInfo}>
                  <Typography variant="label">{workspace.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {t("workspace.details.memberCount", {
                      count: workspace.membersCount,
                    })}
                  </Typography>
                </View>

                {isActive && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent}
                  />
                )}

                <Pressable
                  style={({ pressed }) => [
                    s.detailsButton,
                    pressed && s.pressed,
                  ]}
                  onPress={() => openDetails(workspace.id)}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [s.createButton, pressed && s.pressed]}
          onPress={() => router.push("/(modals)/create-workspace" as never)}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Typography variant="body" color="accent">
            {t("workspace.details.createNew")}
          </Typography>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  centered: {
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  flex: {
    flex: 1,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 0,
  } as ViewStyle,
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 20,
  } as ViewStyle,
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 60,
  } as ViewStyle,
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  rowInfo: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  detailsButton: {
    padding: 4,
  } as ViewStyle,
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  } as ViewStyle,
});

export default WorkspaceListScreen;
