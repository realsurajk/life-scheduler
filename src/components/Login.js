import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { useSignInWithEmailAndPassword, useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import "./Login.css";

const Login = ({ mode = "login", onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);
  const [createUserWithEmailAndPassword, newUser, signupLoading, signupError] = useCreateUserWithEmailAndPassword(auth);

  useEffect(() => {
    if ((user && mode === "login") || (newUser && mode === "signup")) {
      if (onSuccess) onSuccess();
    }
  }, [user, newUser, mode, onSuccess]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "signup") {
      createUserWithEmailAndPassword(email, password);
    } else {
      signInWithEmailAndPassword(email, password);
    }
  };

  return (
    <div className="login-container">
      <h2>{mode === "signup" ? "Sign Up" : "Log In"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading || signupLoading}>
          {mode === "signup" ? "Sign Up" : "Log In"}
        </button>
      </form>
      <div style={{ color: "red", marginTop: 8 }}>
        {(error && error.message) || (signupError && signupError.message)}
      </div>
    </div>
  );
};

export default Login; 