import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getAuth } from "@react-native-firebase/auth";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { usePickerStore } from "@stores/usePickerStore";
import {
  useAllWorkspaces,
  useCancelWorkspaceInvitation,
  useDeleteWorkspace,
  useInviteWorkspaceMember,
  useUpdateWorkspace,
  useWorkspace,
} from "@services/workspaces/workspaces.queries";
import { currencyFlag, getCurrencyByCode } from "@constants/currencies";
import type {
  WorkspaceInvitation,
  WorkspaceMember,
} from "@services/workspaces/workspaces.api";

const MIN_NAME_LENGTH = 2;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WorkspaceDetailsScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id: workspaceId } = useLocalSearchParams<{ id?: string }>();

  const storedName = useWorkspaceStore((s) => s.name);
  const activeId = useWorkspaceStore((s) => s.id);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);

  const [name, setName] = useState(storedName);
  const [currency, setCurrency] = useState("USD");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  const pickedCurrency = usePickerStore((s) => s.currency);
  const clearPicker = usePickerStore((s) => s.clearAll);

  useFocusEffect(
    useCallback(() => {
      if (pickedCurrency) {
        setCurrency(pickedCurrency);
        clearPicker();
      }
    }, [pickedCurrency, clearPicker]),
  );

  const user = getAuth().currentUser;
  const userDisplayName = user?.displayName ?? user?.email ?? "You";
  const userEmail = user?.email ?? null;

  const { data: workspace } = useWorkspace(workspaceId);
  const { data: allWorkspaces = [] } = useAllWorkspaces();
  const workspaceCount = allWorkspaces.length;

  useEffect(() => {
    if (workspace) {
      if (!workspaceId || workspaceId === activeId) {
        setWorkspace(workspace.id, workspace.name);
      }
      setName(workspace.name);
      setCurrency(workspace.currency);
    }
  }, [workspace, workspaceId, activeId, setWorkspace]);

  const trimmedName = name.trim();
  const nameIsValid = trimmedName.length >= MIN_NAME_LENGTH;
  const hasChanges =
    nameIsValid &&
    (trimmedName !== workspace?.name || currency !== workspace?.currency);

  const { mutate: saveWorkspace, isPending: saving } = useUpdateWorkspace();
  const { mutate: sendInvite, isPending: inviteSending } =
    useInviteWorkspaceMember();
  const { mutate: cancelInvite } = useCancelWorkspaceInvitation();
  const { mutate: doDeleteWorkspace, isPending: deleting } =
    useDeleteWorkspace();

  const currentUserEmail = user?.email ?? null;
  const isOwner = workspace?.members.some(
    (m) => m.email === currentUserEmail && m.role === "owner",
  );

  const handleDeleteWorkspace = () => {
    const idToDelete = workspaceId ?? workspace?.id;
    if (!idToDelete) return;

    Alert.alert(
      t("workspace.details.deleteConfirmTitle"),
      t("workspace.details.deleteConfirmMessage", {
        name: workspace?.name ?? "",
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("workspace.details.deleteConfirmButton"),
          style: "destructive",
          onPress: () =>
            doDeleteWorkspace(idToDelete, {
              onSuccess: () => {
                removeWorkspace(idToDelete);
                router.dismissAll();
              },
              onError: (err) => {
                const isLastWorkspace =
                  (err as { status?: number })?.status === 400;
                Alert.alert(
                  t("workspace.details.errors.deleteTitle"),
                  isLastWorkspace
                    ? t("workspace.details.errors.deleteLastMessage")
                    : t("workspace.details.errors.deleteMessage"),
                );
              },
            }),
        },
      ],
    );
  };

  const handleCancelInvite = (invite: WorkspaceInvitation) => {
    Alert.alert(
      t("workspace.details.cancelInviteConfirmTitle"),
      t("workspace.details.cancelInviteConfirmMessage", {
        email: invite.email,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("workspace.details.cancelInviteConfirmButton"),
          style: "destructive",
          onPress: () =>
            cancelInvite(invite.id, {
              onError: () =>
                Alert.alert(
                  t("workspace.details.errors.saveTitle"),
                  t("workspace.details.errors.saveMessage"),
                ),
            }),
        },
      ],
    );
  };

  const isValidEmail = EMAIL_REGEX.test(inviteEmail.trim());

  const members: WorkspaceMember[] = workspace?.members ?? [
    {
      id: user?.uid ?? "owner",
      name: userDisplayName,
      email: userEmail,
      role: "owner",
    },
  ];

  const pendingInvitations: WorkspaceInvitation[] =
    workspace?.pendingInvitations ?? [];

  const membersCount = members.length;
  const displayedName = name.trim() || storedName;
  const initial = displayedName.charAt(0).toUpperCase();

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.closeButton, pressed && s.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Typography variant="label" i18nKey="workspace.details.title" />
        <Pressable
          style={({ pressed }) => [
            s.saveButton,
            pressed && s.pressed,
            (!hasChanges || saving) && s.disabledButton,
          ]}
          onPress={() =>
            hasChanges &&
            !saving &&
            saveWorkspace(
              { workspaceId, name: trimmedName, currency },
              {
                onSuccess: (data) => {
                  if (!workspaceId || workspaceId === activeId) {
                    setWorkspace(data.id, data.name);
                  }
                },
                onError: () =>
                  Alert.alert(
                    t("workspace.details.errors.saveTitle"),
                    t("workspace.details.errors.saveMessage"),
                  ),
              },
            )
          }
          hitSlop={8}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Typography variant="label">{t("common.save")}</Typography>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.heroSection}>
            <View style={s.heroIcon}>
              <Typography variant="h1" color="textOnAccent">
                {initial}
              </Typography>
            </View>
            <Typography variant="label" style={s.heroName}>
              {displayedName}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t("workspace.details.memberCount", { count: membersCount })}
            </Typography>
          </View>

          <Typography
            variant="caption"
            color="textSecondary"
            style={s.sectionLabel}
            i18nKey="workspace.details.generalSection"
          />
          <View style={s.card}>
            <View style={[s.inputRow, s.inputRowDivider]}>
              <Typography
                variant="body"
                color="textSecondary"
                style={s.inputLabel}
                i18nKey="workspace.details.nameLabel"
              />
              <View style={s.inputSeparator} />
              <TextInput
                style={s.textInput}
                value={name}
                onChangeText={setName}
                placeholder={t("workspace.details.namePlaceholder")}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                autoCorrect={false}
                maxLength={50}
              />
            </View>
            <Pressable
              style={({ pressed }) => [s.inputRow, pressed && s.pressed]}
              onPress={() =>
                router.push(
                  `/(modals)/currency-picker?selected=${currency}` as never,
                )
              }
            >
              <Typography
                variant="body"
                color="textSecondary"
                style={s.inputLabel}
                i18nKey="workspace.details.currencyLabel"
              />
              <View style={s.inputSeparator} />
              <Typography
                variant="body"
                style={s.currencyValue}
                numberOfLines={1}
              >
                {`${currencyFlag(currency)} ${getCurrencyByCode(currency)?.name ?? currency}`}
              </Typography>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textTertiary}
              />
            </Pressable>
          </View>

          <Typography
            variant="caption"
            color="textSecondary"
            style={s.sectionLabel}
            i18nKey="workspace.details.membersSection"
          />
          <View style={s.card}>
            {members.map((member, index) => (
              <MemberRow
                key={member.id}
                member={member}
                isLast={
                  index === members.length - 1 &&
                  pendingInvitations.length === 0
                }
                ownerLabel={t("workspace.details.ownerBadge")}
                memberLabel={t("workspace.details.memberBadge")}
              />
            ))}
            {pendingInvitations.map((invite, index) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                isLast={index === pendingInvitations.length - 1}
                pendingLabel={t("workspace.details.pendingBadge")}
                onCancel={() => handleCancelInvite(invite)}
              />
            ))}
          </View>

          <Typography
            variant="caption"
            color="textSecondary"
            style={s.sectionLabel}
            i18nKey="workspace.details.inviteSection"
          />
          <View style={s.card}>
            <View style={s.inputRow}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textSecondary}
              />
              <TextInput
                style={[s.textInput, s.emailInput]}
                value={inviteEmail}
                onChangeText={(text) => {
                  setInviteEmail(text);
                  if (inviteSent) setInviteSent(false);
                }}
                placeholder={t("workspace.details.emailPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (isValidEmail && !inviteSending)
                    sendInvite(inviteEmail.trim(), {
                      onSuccess: () => {
                        setInviteSent(true);
                        setInviteEmail("");
                        setTimeout(() => setInviteSent(false), 3000);
                      },
                      onError: () =>
                        Alert.alert(
                          t("workspace.details.errors.inviteTitle"),
                          t("workspace.details.errors.inviteMessage"),
                        ),
                    });
                }}
              />
              {inviteSent && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                />
              )}
            </View>
          </View>

          <Button
            variant="primary"
            size="sm"
            style={s.inviteButton}
            loading={inviteSending}
            disabled={!isValidEmail || inviteSending || inviteSent}
            onPress={() =>
              sendInvite(inviteEmail.trim(), {
                onSuccess: () => {
                  setInviteSent(true);
                  setInviteEmail("");
                  setTimeout(() => setInviteSent(false), 3000);
                },
                onError: () =>
                  Alert.alert(
                    t("workspace.details.errors.inviteTitle"),
                    t("workspace.details.errors.inviteMessage"),
                  ),
              })
            }
            i18nKey={
              inviteSent
                ? "workspace.details.inviteSent"
                : "workspace.details.sendInvite"
            }
          />

          <View style={s.divider} />

          {workspaceCount <= 1 && (
            <Pressable
              style={({ pressed }) => [s.createButton, pressed && s.pressed]}
              onPress={() => router.push("/(modals)/create-workspace" as never)}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.accent}
              />
              <Typography variant="body" color="accent">
                {t("workspace.details.createNew")}
              </Typography>
            </Pressable>
          )}

          {isOwner && workspaceCount > 1 && (
            <Pressable
              style={({ pressed }) => [
                s.deleteButton,
                pressed && s.pressed,
                deleting && s.pressed,
              ]}
              onPress={handleDeleteWorkspace}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Typography variant="body" color="error">
                {t("workspace.details.deleteWorkspace")}
              </Typography>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

interface MemberRowProps {
  member: WorkspaceMember;
  isLast: boolean;
  ownerLabel: string;
  memberLabel: string;
}

const MemberRow = ({
  member,
  isLast,
  ownerLabel,
  memberLabel,
}: MemberRowProps) => {
  const displayName = member.name ?? member.email ?? "Unknown";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={[s.memberRow, !isLast && s.memberRowDivider]}>
      <View style={s.memberAvatar}>
        <Typography variant="label" color="textOnAccent">
          {initial}
        </Typography>
      </View>
      <View style={s.memberInfo}>
        <Typography variant="body">{displayName}</Typography>
        {member.email && member.name && (
          <Typography variant="caption" color="textSecondary">
            {member.email}
          </Typography>
        )}
      </View>
      <View
        style={[
          s.roleBadge,
          member.role === "owner" ? s.roleBadgeOwner : s.roleBadgeMember,
        ]}
      >
        <Typography
          variant="caption"
          color={member.role === "owner" ? "accent" : "textSecondary"}
        >
          {member.role === "owner" ? ownerLabel : memberLabel}
        </Typography>
      </View>
    </View>
  );
};

interface InviteRowProps {
  invite: WorkspaceInvitation;
  isLast: boolean;
  pendingLabel: string;
  onCancel: () => void;
}

const InviteRow = ({
  invite,
  isLast,
  pendingLabel,
  onCancel,
}: InviteRowProps) => (
  <View style={[s.memberRow, !isLast && s.memberRowDivider]}>
    <View style={[s.memberAvatar, s.memberAvatarPending]}>
      <Ionicons name="mail-outline" size={18} color={colors.textTertiary} />
    </View>
    <View style={s.memberInfo}>
      <Typography variant="body" color="textSecondary">
        {invite.email}
      </Typography>
    </View>
    <View style={[s.roleBadge, s.roleBadgePending]}>
      <Typography variant="caption" color="textTertiary">
        {pendingLabel}
      </Typography>
    </View>
    <Pressable
      style={({ pressed }) => [s.cancelInviteButton, pressed && s.pressed]}
      onPress={onCancel}
      hitSlop={8}
    >
      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
    </Pressable>
  </View>
);

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  flex: {
    flex: 1,
  } as ViewStyle,
  currencyValue: {
    flex: 1,
  } as TextStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  } as ViewStyle,
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  saveButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
  disabledButton: {
    opacity: 0.4,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 0,
  } as ViewStyle,
  heroSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 6,
  } as ViewStyle,
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.iconBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  } as ViewStyle,
  heroName: {
    textAlign: "center",
  } as TextStyle,
  sectionLabel: {
    marginBottom: 6,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as TextStyle,
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 20,
  } as ViewStyle,
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    minHeight: 50,
  } as ViewStyle,
  inputRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  inputLabel: {
    width: 80,
  } as TextStyle,
  inputSeparator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: colors.border,
  } as ViewStyle,
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  } as TextStyle,
  emailInput: {
    fontSize: 16,
  } as TextStyle,
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
    minHeight: 56,
  } as ViewStyle,
  memberRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBlue,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  memberInfo: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: "continuous",
  } as ViewStyle,
  roleBadgeOwner: {
    backgroundColor: `${colors.accent}22`,
  } as ViewStyle,
  roleBadgeMember: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  roleBadgePending: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  memberAvatarPending: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  cancelInviteButton: {
    padding: 2,
  } as ViewStyle,
  inviteButton: {
    marginBottom: 32,
  } as ViewStyle,
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: 20,
  } as ViewStyle,
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  } as ViewStyle,
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  } as ViewStyle,
});

export default WorkspaceDetailsScreen;
