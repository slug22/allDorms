import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import axios from 'axios';

const API_URL = 'http://localhost:3000'; 

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

const DormsScreen = ({ navigation }) => {
  const [dorms, setDorms] = useState([]);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    fetchDorms();
    fetchUserInfo();
  }, []);

  const fetchDorms = async () => {
    try {
      const response = await axios.get(`${API_URL}/dorms`);
      setDorms(response.data);
    } catch (error) {
      console.error('Failed to fetch dorms:', error);
      if (error.response && error.response.status === 401) {
        navigation.navigate('Login');
      }
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/user`);
      setUserInfo(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const handleUnassign = async () => {
    try {
      await axios.post(`${API_URL}/rooms/unassign`);
      alert('Successfully unassigned from the room');
      fetchUserInfo();
    } catch (error) {
      console.error('Failed to unassign:', error);
      alert('Failed to unassign. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dorms</Text>
        {userInfo && userInfo.assignedRoom && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>You are currently assigned to {userInfo.assignedRoom}</Text>
            <TouchableOpacity style={styles.button} onPress={handleUnassign}>
              <Text style={styles.buttonText}>Unassign from current room</Text>
            </TouchableOpacity>
          </View>
        )}
        <FlatList
          data={dorms}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => navigation.navigate('Rooms', { dormId: item._id, dormName: item.name })}
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
  const { dormId, dormName } = route.params;

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/dorms/${dormId}/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      if (error.response && error.response.status === 401) {
        navigation.navigate('Login');
      }
    }
  };

  const assignRoom = async (roomId) => {
    try {
      await axios.post(`${API_URL}/rooms/${roomId}/assign`);
      alert('Room assigned successfully!');
      navigation.navigate('Dorms');
    } catch (error) {
      console.error('Failed to assign room:', error);
      if (error.response && error.response.status === 401) {
        navigation.navigate('Login');
      } else {
        alert('Failed to assign room. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{dormName} Rooms</Text>
        <FlatList
          data={rooms}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.roomItem}>
              <Text style={styles.roomNumber}>Room {item.number}</Text>
              <Text style={styles.roomCapacity}>Capacity: {item.currentStudents.length}/{item.capacity}</Text>
              <Text style={styles.roomOccupants}>Occupants:</Text>
              {item.currentStudents.map((student, index) => (
                <Text key={index} style={styles.occupantName}>{student.name}</Text>
              ))}
              <TouchableOpacity
                style={[styles.button, item.currentStudents.length >= item.capacity && styles.disabledButton]}
                onPress={() => assignRoom(item._id)}
                disabled={item.currentStudents.length >= item.capacity}
              >
                <Text style={styles.buttonText}>Assign Me</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
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