import * as React from 'react';

import { Button, StyleSheet, View } from 'react-native';
import Toastable, {
  ToastableBody,
  showToastable,
} from 'react-native-toastable';

export default function App() {
  return (
    <View style={styles.container}>
      <Button
        title="Show Toastable"
        onPress={() =>
          showToastable({
            message: 'react-native-heroes',
            alwaysVisible: true,
            animationInTiming: 1000,
            animationOutTiming: 1000,
            backgroundColor: 'red',
            duration: 2000,
            contentStyle: {
              marginHorizontal: 20,
            },
            onPress: () => {
              console.log('onPress');
            },
            status: 'success',
            swipeDirection: 'left',
          })
        }
      />
      <Toastable
        containerStyle={{ marginHorizontal: 20 }}
        alwaysVisible
        animationInTiming={2000}
        animationOutTiming={2000}
        duration={5000}
        onToastableHide={() => {
          console.log('onToastableHide');
        }}
        statusMap={{
          success: 'green',
          danger: 'red',
          info: 'blue',
          warning: 'yellow',
        }}
        renderContent={(props) => <ToastableBody {...props} />}
        swipeDirection={['left', 'right']}
      />
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
