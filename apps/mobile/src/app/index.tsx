import { createTranslator, resolveLocale } from "@ar-darwin/i18n";
import { getLocales } from "expo-localization";
import { StyleSheet, Text, View } from "react-native";

const t = createTranslator(resolveLocale(getLocales().map((locale) => locale.languageTag)));

export default function Index() {
  return (
    <View style={styles.container}>
      <Text>{t("app.name")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
