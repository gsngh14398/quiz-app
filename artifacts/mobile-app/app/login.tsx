const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please fill in all fields");
    return;
  }

  setLoading(true);

  try {
    await signInWithEmailAndPassword(auth, email, password);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert("Success", "Login successful ✅");

    router.replace("/(tabs)");
  } catch (error) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Alert.alert("Login Failed", "Invalid credentials ❌");
  } finally {
    setLoading(false);
  }
};
