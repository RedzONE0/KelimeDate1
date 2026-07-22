import { Avatar } from '../types';

export const avatars: Avatar[] = [
  {
    id: 'avatar-1',
    name: 'Siber Oyuncu',
    accentColor: '#8b5cf6',
    imageSource: require('../../assets/avatar-1.jpg'),
  },
  {
    id: 'avatar-2',
    name: 'Yıldız Çocuk',
    accentColor: '#22d3ee',
    imageSource: require('../../assets/avatar-2.jpg'),
  },
  {
    id: 'avatar-3',
    name: 'Robot Dost',
    accentColor: '#34d399',
    imageSource: require('../../assets/avatar-3.jpg'),
  },
  {
    id: 'avatar-4',
    name: 'Mavi Ejderha',
    accentColor: '#3b82f6',
    imageSource: require('../../assets/avatar-4.jpg'),
  },
  {
    id: 'avatar-5',
    name: 'Neon Avcı',
    accentColor: '#f472b6',
    imageSource: require('../../assets/avatar-5.jpg'),
  },
  {
    id: 'avatar-6',
    name: 'Siber Keşif',
    accentColor: '#a16207',
    imageSource: require('../../assets/avatar-6.jpg'),
  },
];

export const getAvatarById = (avatarId: string): Avatar | undefined => {
  return avatars.find((avatar) => avatar.id === avatarId);
};
