import * as Ergometer from 'react-native-ergometer';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const exportedNames = Object.keys(Ergometer).sort();

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const textStyle = isDarkMode ? styles.textDark : styles.textLight;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView
        style={[styles.container, isDarkMode && styles.containerDark]}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, textStyle]}>react-native-ergometer</Text>
          <Text style={[styles.subtitle, textStyle]}>
            Exports ({exportedNames.length})
          </Text>
          {exportedNames.map(name => (
            <Text key={name} style={textStyle}>
              {name}
            </Text>
          ))}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  textLight: {
    color: '#000000',
  },
  textDark: {
    color: '#ffffff',
  },
});

export default App;
