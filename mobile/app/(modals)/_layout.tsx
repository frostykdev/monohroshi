import { Stack } from "expo-router";

const ModalsLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="create-workspace"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
};

export default ModalsLayout;
