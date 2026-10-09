import { createTranslator, resolveLocale } from "@ar-darwin/i18n";
import { getLocales } from "expo-localization";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const t = createTranslator(resolveLocale(getLocales().map((locale) => locale.languageTag)));

export default function Index() {
  return (
    <View style={styles.container}>
      <Text>{t("app.name")}</Text>
      {__DEV__ && <Link href="/dev/design">{t("devDesign.open")}</Link>}
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
