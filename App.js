import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api'; 

axios.defaults.withCredentials = true;

const Stack = createStackNavigator();

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      console.log('Login response:', response.data);
      navigation.navigate('Dorms');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


// In your DormsScreen component
const DormsScreen = ({ navigation }) => {
  const [dorms, setDorms] = useState([]);

  useEffect(() => {
    const fetchDorms = async () => {
      try {
        const response = await axios.get(`${API_URL}/dorms`);
        console.log('Dorms data:', response.data);
        setDorms(response.data);
      } catch (error) {
        console.error('Failed to fetch dorms:', error);
      }
    };

    fetchDorms();
  }, []);

  const handleDormPress = (dorm) => {
    console.log('Selected dorm:', dorm);
    // Extract the ObjectId string from the _id object
    const dormId = dorm._id.$oid || dorm._id;
    console.log('Extracted dorm ID:', dormId);

    navigation.navigate('Rooms', {
      dormId: dormId,
      dormName: dorm.name
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dorms</Text>
        <FlatList
          data={dorms}
          keyExtractor={(item) => item._id.$oid || item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => handleDormPress(item)}
            >
              <Text style={styles.listItemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
};
const RoomsScreen = ({ route, navigation }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const { dormId, dormName } = route.params;

  const fetchRooms = async () => {
    try {
      console.log('Fetching rooms for dorm ID:', dormId);
      const response = await axios.get(`${API_URL}/dorms/${dormId}/rooms`);
      console.log('Rooms response:', response.data);
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to fetch rooms');
    }
  };

  useEffect(() => {
    if (dormId) {
      fetchRooms();
    }
  }, [dormId]);

  const handleRoomAssignment = async (roomId) => {
    try {
      setLoading(true);
      const actualRoomId = roomId.$oid || roomId;
      console.log('Assigning room:', actualRoomId);
      
      const response = await axios.post(`${API_URL}/rooms/${actualRoomId}/assign`);
      console.log('Assignment response:', response.data);
      
      // Refresh the rooms list to show updated assignments
      await fetchRooms();
      
      alert(response.data.message || 'Successfully assigned to room');
    } catch (error) {
      console.error('Failed to assign room:', error.response?.data || error);
      alert(error.response?.data?.error || 'Failed to assign room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{dormName} Rooms</Text>
        <FlatList
          data={rooms}
          keyExtractor={(item) => item._id.$oid || item._id}
          renderItem={({ item }) => (
            <View style={styles.roomItem}>
              <Text style={styles.roomNumber}>Room {item.number}</Text>
              <Text style={styles.roomCapacity}>
                Capacity: {item.current_students?.length || 0}/{item.capacity}
              </Text>
              {item.current_students?.length > 0 && (
                <View style={styles.occupantsList}>
                  <Text style={styles.occupantsTitle}>Current Occupants:</Text>
                  {item.current_students.map((student, index) => (
                    <Text key={index} style={styles.occupantName}>
                      • {student.name}
                    </Text>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.button,
                  (item.current_students?.length >= item.capacity) && styles.disabledButton,
                  loading && styles.loadingButton
                ]}
                onPress={() => handleRoomAssignment(item._id)}
                disabled={item.current_students?.length >= item.capacity || loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Assigning...' : 'Assign Me'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};



// Function to handle room assignment
const handleRoomAssignment = async (roomId) => {
  try {
    await axios.post(`${API_URL}/rooms/${roomId}/assign`);
    alert('Successfully assigned to room');
    // You might want to refresh the rooms data here
  } catch (error) {
    console.error('Failed to assign room:', error);
    alert('Failed to assign room');
  }
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f8f8f8',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dorms" component={DormsScreen} />
        <Stack.Screen name="Rooms" component={RoomsScreen} options={({ route }) => ({ title: route.params.dormName })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  input: {
    height: 50,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
  infoBox: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    marginBottom: 20,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listItemText: {
    fontSize: 18,
  },
  roomItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
  },
  roomNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  roomCapacity: {
    fontSize: 16,
    marginBottom: 10,
  },
  roomOccupants: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  occupantName: {
    fontSize: 14,
    marginLeft: 10,
    marginBottom: 2,
  },
});

export default App;