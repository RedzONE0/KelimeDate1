import { useNavigation } from '@react-navigation/native';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WordChainScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060816" />
      <View style={styles.content}>
        <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backText}>← Ana Sayfa</Text>
        </Pressable>

        <Text style={styles.eyebrow}>OYUN MODU</Text>
        <Text style={styles.title}>Kelime Zinciri</Text>
        <Text style={styles.subtitle}>Bir kelimeyle başlayıp zinciri en uzun sürdüren ol.</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Başlangıç kelimesi</Text>
          <Text style={styles.word}>Güneş</Text>
          <Text style={styles.cardLabel}>Sıradaki kelime</Text>
          <Text style={styles.hint}>Bir sonraki kelime, son harfle başlamalı.</Text>
        </View>

        <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>Kelime Ekle</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060816' },
  content: { flex: 1, padding: 20 },
  backButton: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: '#67e8f9', fontSize: 14, fontWeight: '700' },
  eyebrow: { color: '#8b5cf6', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 18 },
  cardLabel: { color: '#67e8f9', fontWeight: '700', marginBottom: 4 },
  word: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 10 },
  hint: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  primaryButton: { backgroundColor: '#22d3ee', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#07131f', fontSize: 15, fontWeight: '800' },
});