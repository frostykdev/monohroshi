import { Stack } from "expo-router";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

const ModalsLayout = () => {
  return (
    <BottomSheetModalProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="create-workspace"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="currency-picker"
          options={{ presentation: "modal" }}
        />
        {/* <Stack.Screen name="add-category" options={{ presentation: "modal" }} /> */}
      </Stack>
    </BottomSheetModalProvider>
  );
};

export default ModalsLayout;
