import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { DevicesScreen } from './screens/DevicesScreen';
import { FirmwareScreen } from './screens/FirmwareScreen';
import { MachineScreen } from './screens/MachineScreen';
import { useTheme } from './theme';

export type RootStackParamList = {
  Tabs: undefined;
  Machine: { id: string };
};

type TabParamList = {
  Devices: undefined;
  Firmware: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  const theme = useTheme();
  const screenOptions = useMemo<BottomTabNavigationOptions>(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: theme.accent,
      tabBarInactiveTintColor: theme.muted,
      tabBarStyle: {
        backgroundColor: theme.card,
        borderTopColor: theme.border,
      },
      tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
      tabBarIconStyle: { display: 'none' },
    }),
    [theme],
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Firmware" component={FirmwareScreen} />
    </Tab.Navigator>
  );
}

export function Navigation() {
  const theme = useTheme();
  const navigationTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.accent,
        background: theme.background,
        card: theme.card,
        text: theme.text,
        border: theme.border,
      },
    };
  }, [theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Machine" component={MachineScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
