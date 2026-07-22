import React, { useMemo, useRef, useState } from 'react';
import {
ActivityIndicator,
Alert,
Animated,
FlatList,
Keyboard,
Pressable,
ScrollView,
StatusBar,
StyleSheet,
Text,
TextInput,
TouchableOpacity,
View,
Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { avatars, getAvatarById } from '../constants/avatars';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, User } from '../types';

type Gender = 'erkek' | 'kadın' | 'belirtmek_istemiyorum';

const sanitizeText = (value: string, maxLength = 40) =>
value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const uniqueStringArray = (arr: string[]) => Array.from(new Set(arr.map((s) => sanitizeText(s, 40)).filter(Boolean)));

export default function ProfileSetupScreen(): React.ReactElement {
const navigation = useNavigation<any>();
const { user, updateProfileData } = useAuth();

const initialAvatarId = user?.avatarId ?? avatars[0]?.id;
const [selectedAvatarId, setSelectedAvatarId] = useState<string>(initialAvatarId);
const scaleMapRef = useRef<Record<string, Animated.Value>>(
Object.fromEntries(avatars.map((a) => [a.id, new Animated.Value(a.id === initialAvatarId ? 1.08 : 1)]))
);

const [heightCm, setHeightCm] = useState<string>(user?.heightCm != null ? String(user.heightCm) : '');
const [weightKg, setWeightKg] = useState<string>(user?.weightKg != null ? String(user.weightKg) : '');
const [gender, setGender] = useState<Gender>((user?.gender as Gender) ?? 'belirtmek_istemiyorum');

const [hobbyInput, setHobbyInput] = useState<string>('');
const [hobbies, setHobbies] = useState<string[]>(user?.hobbies ?? []);

const [musicInput, setMusicInput] = useState<string>('');
const [musicGenres, setMusicGenres] = useState<string[]>(user?.musicGenres ?? []);

const [saving, setSaving] = useState<boolean>(false);

const onSelectAvatar = (avatarId: string) => {
const prevId = selectedAvatarId;
setSelectedAvatarId(avatarId);
const prevScale = scaleMapRef.current[prevId];
const nextScale = scaleMapRef.current[avatarId];
if (prevScale) Animated.spring(prevScale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }).start();
if (nextScale) Animated.spring(nextScale, { toValue: 1.08, friction: 8, tension: 120, useNativeDriver: true }).start();
};

const handleAddHobby = () => {
const v = sanitizeText(hobbyInput, 30);
if (!v) return;
setHobbies((prev) => uniqueStringArray([...prev, v]));
setHobbyInput('');
Keyboard.dismiss();
};

const handleRemoveHobby = (value: string) => {
setHobbies((prev) => prev.filter((p) => p !== value));
};

const handleAddMusic = () => {
const v = sanitizeText(musicInput, 30);
if (!v) return;
setMusicGenres((prev) => uniqueStringArray([...prev, v]));
setMusicInput('');
Keyboard.dismiss();
};

const handleRemoveMusic = (value: string) => {
setMusicGenres((prev) => prev.filter((p) => p !== value));
};

const parsedNumberOrNull = (s: string) => {
const n = Number(s.replace(',', '.'));
return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
};

const onSave = async () => {
setSaving(true);
try {
const profilePatch: Partial<User> = {
avatarId: selectedAvatarId,
heightCm: parsedNumberOrNull(heightCm),
weightKg: parsedNumberOrNull(weightKg),
gender: (gender as Gender) ?? null,
hobbies: uniqueStringArray(hobbies),
musicGenres: uniqueStringArray(musicGenres),
};

await updateProfileData(profilePatch);
  navigation.replace?.('Home');
} catch (err: any) {
  Alert.alert('Kaydetme Hatası', err?.message ?? 'Profil kaydedilemedi.');
} finally {
  setSaving(false);
}

};

const renderAvatar = ({ item }: { item: Avatar }) => {
const isSelected = item.id === selectedAvatarId;
const animatedStyle = {
transform: [{ scale: scaleMapRef.current[item.id] ?? new Animated.Value(1) }],
borderColor: isSelected ? item.accentColor : 'transparent',
borderWidth: isSelected ? 3 : 0,
};

return (
  <Pressable onPress={() => onSelectAvatar(item.id)} style={styles.avatarItemWrapper}>
    <Animated.View style={[styles.avatarItem, animatedStyle]}>
      <Image source={item.imageSource} style={styles.avatarImage} />
    </Animated.View>
    <Text style={styles.avatarName} numberOfLines={1}>
      {item.name}
    </Text>
  </Pressable>
);

};

const genderButtonStyle = (g: Gender) => [
styles.genderButton,
gender === g ? { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' } : { backgroundColor: 'transparent' },
];

return (
<SafeAreaView style={styles.container}>
<StatusBar barStyle="light-content" backgroundColor="#060816" />
<ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.welcome}>Kelimedate'ye Hoş Geldin</Text>
          <Text style={styles.title}>Profilini Özelleştir</Text>
        </View>

{/* Step 1 - Avatar */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Avatar Seçimi</Text>
      <FlatList
        horizontal
        data={avatars}
        keyExtractor={(i) => i.id}
        renderItem={renderAvatar}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.avatarList}
      />
    </View>

    {/* Step 2 - Basics */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
      <View style={styles.rowInputs}>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Boy (cm)</Text>
          <TextInput
            value={heightCm}
            onChangeText={(t) => setHeightCm(t.replace(/[^0-9,\\.]/g, ''))}
            keyboardType="numeric"
            placeholder="örn. 175"
            placeholderTextColor="#64748b"
            style={styles.input}
            maxLength={4}
          />
        </View>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Kilo (kg)</Text>
          <TextInput
            value={weightKg}
            onChangeText={(t) => setWeightKg(t.replace(/[^0-9,\\.]/g, ''))}
            keyboardType="numeric"
            placeholder="örn. 72"
            placeholderTextColor="#64748b"
            style={styles.input}
            maxLength={4}
          />
        </View>
      </View>

      <View style={styles.genderRow}>
            <Pressable style={genderButtonStyle('erkek')} onPress={() => setGender('erkek')}>
              <Text style={[styles.genderText, gender === 'erkek' && styles.genderTextActive]}>Erkek</Text>
            </Pressable>
            <Pressable style={genderButtonStyle('kadın')} onPress={() => setGender('kadın')}>
              <Text style={[styles.genderText, gender === 'kadın' && styles.genderTextActive]}>Kadın</Text>
            </Pressable>
            <Pressable style={genderButtonStyle('belirtmek_istemiyorum')} onPress={() => setGender('belirtmek_istemiyorum')}>
              <Text
                style={[
                  styles.genderText,
                  gender === 'belirtmek_istemiyorum' && styles.genderTextActive,
                ]}>
                Belirtmek istemiyorum
              </Text>
            </Pressable>
      </View>
    </View>

    {/* Step 3 - Hobbies & Music */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hobilerin</Text>
      <View style={styles.addRow}>
        <TextInput
          value={hobbyInput}
          onChangeText={setHobbyInput}
          placeholder="Hobi ekle (örn. kitap okumak)"
          placeholderTextColor="#64748b"
          style={[styles.input, { flex: 1 }]}
          onSubmitEditing={handleAddHobby}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={handleAddHobby}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.chipsRow}>
        {hobbies.map((h) => (
          <TouchableOpacity key={h} style={styles.chip} onPress={() => handleRemoveHobby(h)}>
            <Text style={styles.chipText}>{h}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Müzik Tarzların</Text>
      <View style={styles.addRow}>
        <TextInput
          value={musicInput}
          onChangeText={setMusicInput}
          placeholder="Müzik türü ekle (örn. pop)"
          placeholderTextColor="#64748b"
          style={[styles.input, { flex: 1 }]}
          onSubmitEditing={handleAddMusic}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={handleAddMusic}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.chipsRow}>
        {musicGenres.map((m) => (
          <TouchableOpacity key={m} style={styles.chip} onPress={() => handleRemoveMusic(m)}>
            <Text style={styles.chipText}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    {/* Save */}
    <View style={styles.footer}>
      <Pressable style={styles.saveButton} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#07131f" /> : <Text style={styles.saveButtonText}>Profili Tamamla ve Oyuna Başla</Text>}
      </Pressable>
    </View>
  </ScrollView>
</SafeAreaView>

);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#060816' },
scrollContent: { padding: 20, paddingBottom: 40 },
header: { marginBottom: 18 },
welcome: { color: '#67e8f9', fontSize: 14, fontWeight: '700', marginBottom: 6 },
title: { color: '#fff', fontSize: 26, fontWeight: '800' },

section: { marginTop: 16 },
sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 12 },

avatarList: { paddingVertical: 6 },
avatarItemWrapper: { alignItems: 'center', marginRight: 14, width: 84 },
avatarItem: {
width: 64,
height: 64,
borderRadius: 34,
overflow: 'hidden',
alignItems: 'center',
justifyContent: 'center',
backgroundColor: 'rgba(255,255,255,0.04)',
},
avatarImage: { width: 64, height: 64, resizeMode: 'cover' },
avatarName: { color: '#94a3b8', fontSize: 11, marginTop: 6, textAlign: 'center' },

rowInputs: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
inputCard: { flex: 1, marginRight: 8 },
inputLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 6 },
input: {
backgroundColor: 'rgba(255,255,255,0.04)',
borderRadius: 12,
paddingHorizontal: 12,
paddingVertical: 10,
color: '#fff',
borderWidth: 1,
borderColor: 'rgba(255,255,255,0.06)',
},

genderRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'space-between' },
genderButton: {
flex: 1,
marginHorizontal: 4,
paddingVertical: 10,
borderRadius: 12,
borderWidth: 1,
borderColor: 'rgba(255,255,255,0.08)',
alignItems: 'center',
},
genderText: { color: '#cbd5e1', fontWeight: '700' },
genderTextActive: { color: '#07131f' },

addRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
addButton: {
width: 44,
height: 44,
borderRadius: 12,
marginLeft: 8,
backgroundColor: '#1f2937',
alignItems: 'center',
justifyContent: 'center',
borderWidth: 1,
borderColor: 'rgba(255,255,255,0.06)',
},
addButtonText: { color: '#fff', fontSize: 22, fontWeight: '800' },

chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
chip: {
backgroundColor: 'rgba(139,92,246,0.12)',
paddingHorizontal: 12,
paddingVertical: 6,
borderRadius: 20,
marginRight: 8,
marginBottom: 8,
borderWidth: 1,
borderColor: 'rgba(139,92,246,0.18)',
},
chipText: { color: '#f8fafc', fontWeight: '700' },

footer: { marginTop: 18 },
saveButton: {
backgroundColor: '#8b5cf6',
paddingVertical: 14,
borderRadius: 16,
alignItems: 'center',
justifyContent: 'center',
borderWidth: 1,
borderColor: '#67e8f9',
shadowColor: '#8b5cf6',
shadowOpacity: 0.35,
shadowRadius: 18,
elevation: 8,
},
saveButtonText: { color: '#07131f', fontSize: 16, fontWeight: '800' },
});
