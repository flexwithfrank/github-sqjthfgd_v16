import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type UserRole = 'trainer' | 'member' | 'guest';

interface RoleBadgeProps {
  role: UserRole;
  verified?: boolean;
  size?: 'small' | 'large';
}

const roleConfig = {
  trainer: {
    icon: 'dumbbell',
    color: '#b0fb50',
    label: 'Trainer',
  },
  member: {
    icon: 'account-heart',
    color: '#1d9bf0',
    label: 'Member',
  },
  guest: {
    icon: 'account-question',
    color: '#666666',
    label: 'Guest',
  },
};

export function RoleBadge({ role, verified = true, size = 'small' }: RoleBadgeProps) {
  const config = roleConfig[role];
  const isLarge = size === 'large';

  return (
    <View style={[
      styles.container,
      { backgroundColor: `${config.color}20` },
      isLarge && styles.containerLarge
    ]}>
      {!isLarge && (
        <Text style={[
          styles.label,
          { color: config.color },
          !isLarge && styles.labelSmall
        ]}>
          {config.label}
        </Text>
      )}
      {isLarge && (
        <>
          <MaterialCommunityIcons
            name={config.icon as any}
            size={20}
            color={config.color}
            style={styles.icon}
          />
          <Text style={[
            styles.label,
            { color: config.color },
            isLarge && styles.labelLarge
          ]}>
            {config.label}
          </Text>
          {role === 'trainer' && (
            <MaterialCommunityIcons
              name={verified ? 'check-decagram' : 'decagram-outline'}
              size={16}
              color={verified ? config.color : '#666666'}
              style={styles.verifiedIcon}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 12,
  },
  labelLarge: {
    fontSize: 14,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
});