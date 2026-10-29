import { translate as tr, useTranslation as useSystemTranslation } from '../i18n';
import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function NotFoundScreen() {
  useSystemTranslation();
  return (
    <>
      <Stack.Screen options={{ title: tr("Oops!") }} />
      <View style={styles.container}>
        <Text style={styles.title}>{tr("This screen doesn't exist.")}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{tr("Go to home screen!")}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
