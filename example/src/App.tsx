import * as React from 'react';

import { Button, StyleSheet, View } from 'react-native';
import { Toastable } from 'react-native-toastable';
import { showToastable } from 'src/utils';

export default function App() {
  return (
    <View style={styles.container}>
      <Button
        title="Show Toastable"
        onPress={() => showToastable({ message: 'react-native-heroes' })}
      />
      <Toastable containerStyle={styles.toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    marginTop: 200,
  },
});
