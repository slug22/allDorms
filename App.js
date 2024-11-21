import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, ScrollView, Picker } from 'react-native';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api'; 

axios.defaults.withCredentials = true;

const Stack = createStackNavigator();
// Define styles first
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
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
  loadingButton: {
    opacity: 0.7,
  },
  section: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  picker: {
    height: 50,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
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
  occupantsList: {
    marginTop: 10,
    marginBottom: 10,
  },
  occupantsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  occupantName: {
    fontSize: 14,
    marginLeft: 10,
    marginBottom: 2,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#000',
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  adminButton: {
    backgroundColor: '#34C759',
  },
});

// Add this new component for the selection screen
const SelectLoginScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <TouchableOpacity 
          style={[styles.button, { marginBottom: 20 }]} 
          onPress={() => navigation.navigate('StudentLogin')}
        >
          <Text style={styles.buttonText}>Student Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => navigation.navigate('AdminLogin')}
        >
          <Text style={styles.buttonText}>Admin Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Rename your current LoginScreen to StudentLoginScreen
const StudentLoginScreen = ({ navigation }) => {
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
        <Text style={styles.title}>Student Login</Text>
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
// AdminLoginScreen.js
const AdminLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/admin/login`, {
        email,
        password,
        school_id: schoolId,
      });
      console.log('Admin login successful:', response.data);
      navigation.navigate('AdminDashboard', { 
        schoolId, 
        schoolName: response.data.school.name 
      });
    } catch (error) {
      console.error('Admin login failed:', error.response?.data);
      alert(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Admin Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Admin Email"
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
        <TextInput
          style={styles.input}
          placeholder="School ID"
          value={schoolId}
          onChangeText={setSchoolId}
        />
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAdminLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login as Admin'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const AdminDashboardScreen = ({ route, navigation }) => {
  const { schoolId, schoolName } = route.params;
  const [dormName, setDormName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [selectedDorm, setSelectedDorm] = useState(null);
  const [dorms, setDorms] = useState([]);
  const [loading, setLoading] = useState(false);

  const createDorm = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/admin/dorms`, {
        name: dormName,
        school_id: schoolId,
      });
      alert('Dorm created successfully');
      setDormName('');
      fetchDorms(); // Refresh dorms list
    } catch (error) {
      console.error('Failed to create dorm:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to create dorm');
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!selectedDorm) {
      alert('Please select a dorm first');
      return;
    }

    try {
      setLoading(true);
      // Extract the ObjectId string correctly
      const dormId = selectedDorm.$oid || selectedDorm;
      
      const response = await axios.post(`${API_URL}/admin/rooms`, {
        dorm_id: dormId,
        number: roomNumber,
        capacity: parseInt(capacity),
      });
      
      alert('Room created successfully');
      setRoomNumber('');
      setCapacity('');
    } catch (error) {
      console.error('Failed to create room:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDorms();
  }, []);

  const fetchDorms = async () => {
    try {
      const response = await axios.get(`${API_URL}/dorms`);
      setDorms(response.data);
    } catch (error) {
      console.error('Failed to fetch dorms:', error);
      alert('Failed to fetch dorms');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>{schoolName} Admin Dashboard</Text>
        
        {/* Create Dorm Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create New Dorm</Text>
          <TextInput
            style={styles.input}
            placeholder="Dorm Name"
            value={dormName}
            onChangeText={setDormName}
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={createDorm}
            disabled={loading || !dormName.trim()}
          >
            <Text style={styles.buttonText}>Create Dorm</Text>
          </TouchableOpacity>
        </View>

        {/* Create Room Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create New Room</Text>
          <Picker
            selectedValue={selectedDorm}
            onValueChange={(itemValue) => setSelectedDorm(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select a Dorm" value={null} />
            {dorms.map(dorm => (
              <Picker.Item 
                key={dorm._id.$oid || dorm._id} 
                label={dorm.name} 
                value={dorm._id.$oid || dorm._id} 
              />
            ))}
          </Picker>
          <TextInput
            style={styles.input}
            placeholder="Room Number"
            value={roomNumber}
            onChangeText={setRoomNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Capacity"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={createRoom}
            disabled={loading || !selectedDorm || !roomNumber.trim() || !capacity}
          >
            <Text style={styles.buttonText}>Create Room</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// CreateStudentScreen.js
const CreateStudentScreen = ({ route, navigation }) => {
  const { schoolId } = route.params;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateStudent = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/admin/students`, {
        email,
        password,
        school_id: schoolId,
      });
      alert('Student created successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create student:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create New Student</Text>
        <TextInput
          style={styles.input}
          placeholder="Student Email"
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
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateStudent}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Student'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Update the App component with the new navigation structure
const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="SelectLogin"
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
        <Stack.Screen 
          name="SelectLogin" 
          component={SelectLoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="StudentLogin" 
          component={StudentLoginScreen}
          options={{ 
            title: 'Student Login',
            headerLeft: null,
          }} 
        />
        <Stack.Screen 
          name="AdminLogin" 
          component={AdminLoginScreen}
          options={{ 
            title: 'Admin Login',
            headerLeft: null,
          }} 
        />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="CreateStudent" component={CreateStudentScreen} />
        <Stack.Screen name="Dorms" component={DormsScreen} />
        <Stack.Screen 
          name="Rooms" 
          component={RoomsScreen} 
          options={({ route }) => ({ title: route.params.dormName })} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Add these additional styles to your existing styles
const additionalStyles = StyleSheet.create({
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#000',
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  adminButton: {
    backgroundColor: '#34C759',
  },
});

// Merge the additional styles with your existing styles
Object.assign(styles, additionalStyles);
export default App;